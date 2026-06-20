<?php
/**
 * Cleanup on uninstall.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'timekairos_chat_settings' );

global $wpdb;
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_tk_chat_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_tk_chat_' ) . '%'
	)
);
