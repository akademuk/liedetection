<?php
/**
 * Bootstrap: assets, hooks.
 */

defined( 'ABSPATH' ) || exit;

class TK_Plugin {

	/** @var self|null */
	private static $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', array( $this, 'register_assets' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend' ) );

		TK_Admin::init();
		TK_REST_API::init();
	}

	public function register_assets(): void {
		wp_register_style(
			'timekairos-chat',
			TK_CHAT_URL . 'assets/css/chat-widget.css',
			array(),
			TK_CHAT_VERSION
		);

		wp_register_script(
			'timekairos-chat',
			TK_CHAT_URL . 'assets/js/chat-widget.js',
			array(),
			TK_CHAT_VERSION,
			true
		);
	}

	public function enqueue_frontend(): void {
		if ( is_admin() || ! self::is_enabled() ) {
			return;
		}

		wp_enqueue_style( 'timekairos-chat' );
		wp_enqueue_script( 'timekairos-chat' );

		$settings = TK_Admin::get_settings();

		wp_localize_script(
			'timekairos-chat',
			'tkChatConfig',
			array(
				'restUrl'      => esc_url_raw( rest_url( 'timekairos-chat/v1/' ) ),
				'nonce'        => wp_create_nonce( 'wp_rest' ),
				'pollInterval' => max( 2000, (int) $settings['poll_interval'] ),
				'title'        => $settings['widget_title'],
				'subtitle'     => $settings['widget_subtitle'],
				'welcome'      => $settings['welcome_message'],
				'storageKey'   => 'tk_chat_' . substr( hash( 'sha256', (string) get_option( 'siteurl' ) ), 0, 12 ),
			)
		);
	}

	public static function is_enabled(): bool {
		$settings = TK_Admin::get_settings();
		return ! empty( $settings['enabled'] );
	}
}
