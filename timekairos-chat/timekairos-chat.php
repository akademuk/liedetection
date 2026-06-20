<?php
/**
 * Plugin Name:       Timekairos Chat
 * Plugin URI:        https://timekairos.com
 * Description:       Віджет онлайн-чату з підтримкою Telegram-менеджерів та AI (локальні моделі або API). Розроблено Timekairos.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Timekairos
 * Author URI:        https://timekairos.com
 * License:           GPL-2.0-or-later
 * Text Domain:       timekairos-chat
 */

defined( 'ABSPATH' ) || exit;

define( 'TK_CHAT_VERSION', '1.0.0' );
define( 'TK_CHAT_FILE', __FILE__ );
define( 'TK_CHAT_PATH', plugin_dir_path( __FILE__ ) );
define( 'TK_CHAT_URL', plugin_dir_url( __FILE__ ) );

require_once TK_CHAT_PATH . 'includes/class-tk-cache.php';
require_once TK_CHAT_PATH . 'includes/class-tk-rate-limiter.php';
require_once TK_CHAT_PATH . 'includes/class-tk-ai-provider.php';
require_once TK_CHAT_PATH . 'includes/class-tk-chat-handler.php';
require_once TK_CHAT_PATH . 'includes/class-tk-rest-api.php';
require_once TK_CHAT_PATH . 'includes/class-tk-admin.php';
require_once TK_CHAT_PATH . 'includes/class-tk-plugin.php';

TK_Plugin::instance();
