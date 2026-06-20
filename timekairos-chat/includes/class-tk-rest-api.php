<?php
/**
 * Public REST endpoints (nonce-protected).
 */

defined( 'ABSPATH' ) || exit;

class TK_REST_API {

	public static function init(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes(): void {
		register_rest_route(
			'timekairos-chat/v1',
			'/send',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_send' ),
				'permission_callback' => array( __CLASS__, 'verify_request' ),
				'args'                => array(
					'text'    => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
					),
					'user_id' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			'timekairos-chat/v1',
			'/poll',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_poll' ),
				'permission_callback' => array( __CLASS__, 'verify_request' ),
				'args'                => array(
					'user_id' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	public static function verify_request( WP_REST_Request $request ): bool {
		if ( ! TK_Plugin::is_enabled() ) {
			return false;
		}

		$nonce = $request->get_header( 'X-WP-Nonce' );
		if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return false;
		}

		$settings = TK_Admin::get_settings();
		$window   = max( 30, (int) ( $settings['rate_limit_window'] ?? 60 ) );
		$route    = $request->get_route();
		$is_poll  = (bool) preg_match( '#/poll$#', $route );
		$max      = $is_poll ? 120 : max( 5, (int) ( $settings['rate_limit_max'] ?? 30 ) );

		return TK_Rate_Limiter::check( TK_Rate_Limiter::client_ip(), $max, $window, $is_poll ? 'poll' : 'send' );
	}

	public static function handle_send( WP_REST_Request $request ): WP_REST_Response {
		$user_id = (string) $request->get_param( 'user_id' );
		$text    = (string) $request->get_param( 'text' );

		if ( ! TK_Chat_Handler::validate_user_id( $user_id ) ) {
			return new WP_REST_Response( array( 'ok' => false, 'error' => 'invalid user_id' ), 400 );
		}

		if ( mb_strlen( $text ) > 4096 ) {
			return new WP_REST_Response( array( 'ok' => false, 'error' => 'text too long' ), 400 );
		}

		$handler = new TK_Chat_Handler( TK_Admin::get_settings() );
		$result  = $handler->send_message( $user_id, $text );

		$status = ! empty( $result['ok'] ) ? 200 : 500;
		return new WP_REST_Response( $result, $status );
	}

	public static function handle_poll( WP_REST_Request $request ): WP_REST_Response {
		$user_id = (string) $request->get_param( 'user_id' );

		if ( ! TK_Chat_Handler::validate_user_id( $user_id ) ) {
			return new WP_REST_Response( array( 'ok' => false, 'error' => 'invalid user_id' ), 400 );
		}

		$handler  = new TK_Chat_Handler( TK_Admin::get_settings() );
		$messages = $handler->poll_messages( $user_id );

		return new WP_REST_Response(
			array(
				'ok'       => true,
				'messages' => $messages,
			),
			200
		);
	}
}
