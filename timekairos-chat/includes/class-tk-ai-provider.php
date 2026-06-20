<?php
/**
 * AI providers: OpenAI-compatible API, Ollama (local), custom endpoint.
 */

defined( 'ABSPATH' ) || exit;

class TK_AI_Provider {

	/**
	 * @param array<string,mixed> $settings
	 * @param array<int,array{role:string,content:string}> $history
	 */
	public static function generate_reply( array $settings, string $user_message, array $history = array() ): ?string {
		if ( empty( $settings['ai_enabled'] ) || empty( $settings['ai_provider'] ) ) {
			return null;
		}

		$messages = self::build_messages( $settings, $history, $user_message );
		$provider = $settings['ai_provider'];

		switch ( $provider ) {
			case 'openai':
				return self::call_openai_compatible(
					'https://api.openai.com/v1/chat/completions',
					$settings['openai_api_key'] ?? '',
					$settings['openai_model'] ?? 'gpt-4o-mini',
					$messages
				);

			case 'anthropic':
				return self::call_anthropic(
					$settings['anthropic_api_key'] ?? '',
					$settings['anthropic_model'] ?? 'claude-3-5-haiku-20241022',
					$messages,
					$settings['ai_system_prompt'] ?? ''
				);

			case 'ollama':
				return self::call_openai_compatible(
					trailingslashit( $settings['ollama_base_url'] ?? 'http://127.0.0.1:11434' ) . 'v1/chat/completions',
					'ollama',
					$settings['ollama_model'] ?? 'llama3.2',
					$messages,
					false
				);

			case 'custom':
				$base = rtrim( $settings['custom_api_base'] ?? '', '/' );
				if ( ! $base ) {
					return null;
				}
				return self::call_openai_compatible(
					$base . '/chat/completions',
					$settings['custom_api_key'] ?? '',
					$settings['custom_model'] ?? 'default',
					$messages,
					! empty( $settings['custom_api_key'] )
				);

			default:
				return null;
		}
	}

	/**
	 * @param array<int,array{role:string,content:string}> $history
	 * @return array<int,array{role:string,content:string}>
	 */
	private static function build_messages( array $settings, array $history, string $user_message ): array {
		$messages = array();

		$system = trim( $settings['ai_system_prompt'] ?? '' );
		if ( $system ) {
			$messages[] = array(
				'role'    => 'system',
				'content' => $system,
			);
		}

		$limit = max( 2, min( 20, (int) ( $settings['ai_history_limit'] ?? 8 ) ) );
		$slice = array_slice( $history, -$limit );
		foreach ( $slice as $item ) {
			if ( empty( $item['role'] ) || empty( $item['content'] ) ) {
				continue;
			}
			$messages[] = array(
				'role'    => $item['role'],
				'content' => $item['content'],
			);
		}

		$messages[] = array(
			'role'    => 'user',
			'content' => $user_message,
		);

		return $messages;
	}

	/**
	 * @param array<int,array{role:string,content:string}> $messages
	 */
	private static function call_openai_compatible(
		string $url,
		string $api_key,
		string $model,
		array $messages,
		bool $require_key = true
	): ?string {
		if ( $require_key && ! $api_key ) {
			return null;
		}

		$headers = array(
			'Content-Type' => 'application/json',
		);
		if ( $api_key ) {
			$headers['Authorization'] = 'Bearer ' . $api_key;
		}

		$body = array(
			'model'       => $model,
			'messages'    => $messages,
			'max_tokens'  => 800,
			'temperature' => 0.4,
		);

		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 45,
				'headers' => $headers,
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( '[Timekairos Chat] AI request failed: ' . $response->get_error_message() );
			}
			return null;
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return null;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) ) {
			return null;
		}

		$content = $data['choices'][0]['message']['content'] ?? '';
		$content = is_string( $content ) ? trim( $content ) : '';

		return $content ?: null;
	}

	/**
	 * @param array<int,array{role:string,content:string}> $messages
	 */
	private static function call_anthropic( string $api_key, string $model, array $messages, string $system_prompt ): ?string {
		if ( ! $api_key ) {
			return null;
		}

		$anthropic_messages = array();
		foreach ( $messages as $msg ) {
			if ( 'system' === $msg['role'] ) {
				if ( ! $system_prompt ) {
					$system_prompt = $msg['content'];
				}
				continue;
			}
			$anthropic_messages[] = array(
				'role'    => 'assistant' === $msg['role'] ? 'assistant' : 'user',
				'content' => $msg['content'],
			);
		}

		$body = array(
			'model'      => $model,
			'max_tokens' => 800,
			'messages'   => $anthropic_messages,
		);
		if ( $system_prompt ) {
			$body['system'] = $system_prompt;
		}

		$response = wp_remote_post(
			'https://api.anthropic.com/v1/messages',
			array(
				'timeout' => 45,
				'headers' => array(
					'Content-Type'      => 'application/json',
					'x-api-key'         => $api_key,
					'anthropic-version' => '2023-06-01',
				),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return null;
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return null;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) || empty( $data['content'][0]['text'] ) ) {
			return null;
		}

		return trim( (string) $data['content'][0]['text'] ) ?: null;
	}
}
