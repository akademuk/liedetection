<?php
/**
 * Per-IP rate limiting via transients.
 */

defined( 'ABSPATH' ) || exit;

class TK_Rate_Limiter {

	public static function check( string $ip, int $max_requests, int $window_seconds, string $bucket = 'send' ): bool {
		$key   = 'rl_' . md5( $ip . ':' . $bucket );
		$entry = TK_Cache::get( $key );

		$now = time();
		if ( ! is_array( $entry ) || ( $now - (int) $entry['start'] ) > $window_seconds ) {
			$entry = array(
				'start' => $now,
				'count' => 0,
			);
		}

		$entry['count']++;
		TK_Cache::set( $key, $entry, $window_seconds );

		return $entry['count'] <= $max_requests;
	}

	public static function client_ip(): string {
		$ip = '';
		if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$parts = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
			$ip    = trim( $parts[0] );
		} elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
		}
		return $ip ?: 'unknown';
	}
}
