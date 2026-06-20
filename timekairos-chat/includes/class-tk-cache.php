<?php
/**
 * Transient-based cache with optional object-cache passthrough.
 */

defined( 'ABSPATH' ) || exit;

class TK_Cache {

	private const PREFIX = 'tk_chat_';

	public static function get( string $key ) {
		$full = self::PREFIX . $key;
		if ( wp_using_ext_object_cache() ) {
			$value = wp_cache_get( $full, 'timekairos_chat' );
			return false === $value ? null : $value;
		}
		$value = get_transient( $full );
		return false === $value ? null : $value;
	}

	public static function set( string $key, $value, int $ttl_seconds ): void {
		$full = self::PREFIX . $key;
		if ( wp_using_ext_object_cache() ) {
			wp_cache_set( $full, $value, 'timekairos_chat', $ttl_seconds );
			return;
		}
		set_transient( $full, $value, $ttl_seconds );
	}

	public static function delete( string $key ): void {
		$full = self::PREFIX . $key;
		if ( wp_using_ext_object_cache() ) {
			wp_cache_delete( $full, 'timekairos_chat' );
			return;
		}
		delete_transient( $full );
	}

	/** @return bool True when lock acquired. */
	public static function try_lock( string $key, int $ttl_seconds ): bool {
		$lock_key = 'lock_' . $key;
		if ( null !== self::get( $lock_key ) ) {
			return false;
		}
		self::set( $lock_key, 1, $ttl_seconds );
		return true;
	}

	public static function release_lock( string $key ): void {
		self::delete( 'lock_' . $key );
	}
}
