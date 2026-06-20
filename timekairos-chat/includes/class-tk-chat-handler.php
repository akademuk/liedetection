<?php
/**
 * Chat routing: Telegram managers + optional AI.
 */

defined( 'ABSPATH' ) || exit;

class TK_Chat_Handler {

	private const USER_ID_PATTERN     = '/^usr_[a-z0-9]+$/i';
	private const USER_ID_EXTRACT     = '/usr_[a-z0-9]+/i';
	private const INBOX_TTL           = 1800;
	private const INBOX_MAX           = 100;
	private const OFFSET_TTL          = 86400;
	private const PUMP_LOCK_TTL       = 8;

	/** @var array<string,mixed> */
	private $settings;

	/** @param array<string,mixed> $settings */
	public function __construct( array $settings ) {
		$this->settings = $settings;
	}

	public static function validate_user_id( string $user_id ): bool {
		return (bool) preg_match( self::USER_ID_PATTERN, $user_id );
	}

	/**
	 * @return array{ok:bool,error?:string}
	 */
	public function send_message( string $user_id, string $text ): array {
		$text = sanitize_textarea_field( $text );
		if ( ! $text ) {
			return array( 'ok' => false, 'error' => 'text is required' );
		}

		$mode = $this->settings['response_mode'] ?? 'telegram';

		if ( in_array( $mode, array( 'telegram', 'hybrid' ), true ) ) {
			$telegram_result = $this->send_to_telegram( $user_id, $text );
			if ( ! $telegram_result['ok'] && 'telegram' === $mode ) {
				return $telegram_result;
			}
		}

		if ( in_array( $mode, array( 'ai', 'hybrid' ), true ) && ! empty( $this->settings['ai_enabled'] ) ) {
			$ai_reply = $this->maybe_ai_reply( $user_id, $text );
			if ( $ai_reply ) {
				$this->push_to_inbox(
					$user_id,
					array(
						'id'   => 'ai_' . wp_generate_password( 12, false, false ),
						'text' => $ai_reply,
						'ts'   => time(),
					)
				);
			} elseif ( 'ai' === $mode ) {
				return array( 'ok' => false, 'error' => 'AI unavailable' );
			}
		}

		$this->pump_telegram();

		return array( 'ok' => true );
	}

	/**
	 * @return array<int,array{id:string,text:string,ts:int}>
	 */
	public function poll_messages( string $user_id ): array {
		$this->pump_telegram();
		return $this->drain_inbox( $user_id );
	}

	/**
	 * @return array{ok:bool,error?:string,description?:string}
	 */
	private function send_to_telegram( string $user_id, string $text ): array {
		$token  = $this->settings['telegram_bot_token'] ?? '';
		$chat_id = $this->settings['telegram_chat_id'] ?? '';

		if ( ! $token || ! $chat_id ) {
			return array( 'ok' => false, 'error' => 'Telegram not configured' );
		}

		$site_name = get_bloginfo( 'name' );
		$message   = "🌐 {$site_name}\n👤 {$user_id}\n\n{$text}";

		$result = $this->telegram_request(
			$token,
			'sendMessage',
			array(
				'chat_id'                  => $chat_id,
				'text'                     => $message,
				'disable_web_page_preview' => true,
			)
		);

		if ( ! is_array( $result ) || empty( $result['ok'] ) ) {
			return array(
				'ok'          => false,
				'error'       => 'telegram send failed',
				'description' => $result['description'] ?? '',
			);
		}

		return array( 'ok' => true );
	}

	private function maybe_ai_reply( string $user_id, string $text ): ?string {
		$history = $this->get_conversation_history( $user_id );
		$history[] = array( 'role' => 'user', 'content' => $text );
		$this->save_conversation_history( $user_id, $history );

		$reply = TK_AI_Provider::generate_reply( $this->settings, $text, $history );
		if ( ! $reply ) {
			return null;
		}

		$history[] = array( 'role' => 'assistant', 'content' => $reply );
		$this->save_conversation_history( $user_id, $history );

		return $reply;
	}

	/**
	 * @return array<int,array{role:string,content:string}>
	 */
	private function get_conversation_history( string $user_id ): array {
		$key  = 'conv_' . $user_id;
		$data = TK_Cache::get( $key );
		return is_array( $data ) ? $data : array();
	}

	/**
	 * @param array<int,array{role:string,content:string}> $history
	 */
	private function save_conversation_history( string $user_id, array $history ): void {
		$limit = max( 2, min( 40, (int) ( $this->settings['ai_history_limit'] ?? 8 ) * 2 ) );
		TK_Cache::set( 'conv_' . $user_id, array_slice( $history, -$limit ), 3600 );
	}

	/**
	 * @param array{id:string,text:string,ts:int} $message
	 */
	private function push_to_inbox( string $user_id, array $message ): void {
		$key    = 'inbox_' . $user_id;
		$inbox  = TK_Cache::get( $key );
		$inbox  = is_array( $inbox ) ? $inbox : array();

		foreach ( $inbox as $item ) {
			if ( isset( $item['id'] ) && $item['id'] === $message['id'] ) {
				return;
			}
		}

		$inbox[] = $message;
		while ( count( $inbox ) > self::INBOX_MAX ) {
			array_shift( $inbox );
		}

		TK_Cache::set( $key, $inbox, self::INBOX_TTL );
	}

	/**
	 * @return array<int,array{id:string,text:string,ts:int}>
	 */
	private function drain_inbox( string $user_id ): array {
		$key      = 'inbox_' . $user_id;
		$messages = TK_Cache::get( $key );
		TK_Cache::delete( $key );
		return is_array( $messages ) ? $messages : array();
	}

	public function pump_telegram(): void {
		if ( ! TK_Cache::try_lock( 'pump', self::PUMP_LOCK_TTL ) ) {
			return;
		}

		try {
			$token   = $this->settings['telegram_bot_token'] ?? '';
			$chat_id = $this->settings['telegram_chat_id'] ?? '';
			if ( ! $token || ! $chat_id ) {
				return;
			}

			$offset = (int) ( TK_Cache::get( 'tg_offset' ) ?? 0 );
			$url    = add_query_arg(
				array(
					'offset'  => $offset,
					'timeout' => 0,
				),
				"https://api.telegram.org/bot{$token}/getUpdates"
			);

			$response = wp_remote_get( $url, array( 'timeout' => 15 ) );
			if ( is_wp_error( $response ) ) {
				return;
			}

			if ( 409 === (int) wp_remote_retrieve_response_code( $response ) ) {
				$this->telegram_request( $token, 'deleteWebhook', array( 'drop_pending_updates' => false ) );
				return;
			}

			$data = json_decode( wp_remote_retrieve_body( $response ), true );
			if ( ! is_array( $data ) || empty( $data['ok'] ) || ! is_array( $data['result'] ) ) {
				return;
			}

			$max_update_id = $offset > 0 ? $offset - 1 : -1;

			foreach ( $data['result'] as $update ) {
				if ( ! isset( $update['update_id'] ) ) {
					continue;
				}
				$update_id = (int) $update['update_id'];
				if ( $update_id > $max_update_id ) {
					$max_update_id = $update_id;
				}

				$msg = $update['message'] ?? null;
				if ( ! is_array( $msg ) ) {
					continue;
				}
				if ( (string) ( $msg['chat']['id'] ?? '' ) !== (string) $chat_id ) {
					continue;
				}
				if ( empty( $msg['reply_to_message']['text'] ) ) {
					continue;
				}

				$user_id = $this->extract_user_id( (string) $msg['reply_to_message']['text'] );
				if ( ! $user_id || ! self::validate_user_id( $user_id ) ) {
					continue;
				}

				$this->push_to_inbox(
					$user_id,
					array(
						'id'   => (string) ( $msg['message_id'] ?? wp_generate_password( 8, false, false ) ),
						'text' => sanitize_textarea_field( (string) ( $msg['text'] ?? '' ) ),
						'ts'   => (int) ( $msg['date'] ?? time() ),
					)
				);
			}

			if ( $max_update_id >= 0 ) {
				TK_Cache::set( 'tg_offset', $max_update_id + 1, self::OFFSET_TTL );
			}
		} finally {
			TK_Cache::release_lock( 'pump' );
		}
	}

	private function extract_user_id( string $text ): ?string {
		if ( ! preg_match( self::USER_ID_EXTRACT, $text, $matches ) ) {
			return null;
		}
		return strtolower( $matches[0] );
	}

	/**
	 * @param array<string,mixed> $body
	 * @return array<string,mixed>|null
	 */
	private function telegram_request( string $token, string $method, array $body = array() ) {
		$url = "https://api.telegram.org/bot{$token}/{$method}";

		$args = array( 'timeout' => 20 );
		if ( $body ) {
			$args['headers'] = array( 'Content-Type' => 'application/json' );
			$args['body']    = wp_json_encode( $body );
			$response        = wp_remote_post( $url, $args );
		} else {
			$response = wp_remote_get( $url, $args );
		}

		if ( is_wp_error( $response ) ) {
			return null;
		}

		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
		return is_array( $decoded ) ? $decoded : null;
	}
}
