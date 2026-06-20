<?php
/**
 * Admin settings: tokens, AI providers, widget copy.
 */

defined( 'ABSPATH' ) || exit;

class TK_Admin {

	private const OPTION_KEY = 'timekairos_chat_settings';

	public static function init(): void {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( TK_CHAT_FILE ), array( __CLASS__, 'action_links' ) );
	}

	/** @param array<string> $links */
	public static function action_links( array $links ): array {
		$settings = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'options-general.php?page=timekairos-chat' ) ),
			esc_html__( 'Налаштування', 'timekairos-chat' )
		);
		array_unshift( $links, $settings );
		return $links;
	}

	public static function register_menu(): void {
		add_options_page(
			__( 'Timekairos Chat', 'timekairos-chat' ),
			__( 'Timekairos Chat', 'timekairos-chat' ),
			'manage_options',
			'timekairos-chat',
			array( __CLASS__, 'render_page' )
		);
	}

	public static function register_settings(): void {
		register_setting(
			'timekairos_chat_group',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize_settings' ),
				'default'           => self::defaults(),
			)
		);
	}

	/** @return array<string,mixed> */
	public static function defaults(): array {
		return array(
			'enabled'             => 1,
			'response_mode'       => 'telegram',
			'telegram_bot_token'  => '',
			'telegram_chat_id'    => '',
			'ai_enabled'          => 0,
			'ai_provider'         => 'openai',
			'openai_api_key'      => '',
			'openai_model'        => 'gpt-4o-mini',
			'anthropic_api_key'   => '',
			'anthropic_model'     => 'claude-3-5-haiku-20241022',
			'ollama_base_url'     => 'http://127.0.0.1:11434',
			'ollama_model'        => 'llama3.2',
			'custom_api_base'     => '',
			'custom_api_key'      => '',
			'custom_model'        => '',
			'ai_system_prompt'    => 'Ви — ввічливий консультант компанії. Відповідайте коротко українською. Якщо питання потребує менеджера — запропонуйте дочекатися відповіді оператора.',
			'ai_history_limit'    => 8,
			'widget_title'        => 'Онлайн-консультація',
			'widget_subtitle'     => 'Відповімо найближчим часом',
			'welcome_message'     => 'Вітаємо! Напишіть питання — ми відповімо тут.',
			'poll_interval'       => 3000,
			'rate_limit_max'      => 20,
			'rate_limit_window'   => 60,
		);
	}

	/** @return array<string,mixed> */
	public static function get_settings(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		return array_merge( self::defaults(), $stored );
	}

	/**
	 * @param array<string,mixed> $input
	 * @return array<string,mixed>
	 */
	public static function sanitize_settings( $input ): array {
		if ( ! is_array( $input ) ) {
			return self::defaults();
		}

		$current = self::get_settings();
		$clean   = self::defaults();

		$clean['enabled']           = empty( $input['enabled'] ) ? 0 : 1;
		$clean['ai_enabled']        = empty( $input['ai_enabled'] ) ? 0 : 1;
		$clean['response_mode']     = in_array( $input['response_mode'] ?? '', array( 'telegram', 'ai', 'hybrid' ), true )
			? $input['response_mode']
			: 'telegram';
		$clean['ai_provider']       = in_array( $input['ai_provider'] ?? '', array( 'openai', 'anthropic', 'ollama', 'custom' ), true )
			? $input['ai_provider']
			: 'openai';

		$clean['telegram_chat_id']  = sanitize_text_field( $input['telegram_chat_id'] ?? '' );
		$clean['openai_model']      = sanitize_text_field( $input['openai_model'] ?? $clean['openai_model'] );
		$clean['anthropic_model']   = sanitize_text_field( $input['anthropic_model'] ?? $clean['anthropic_model'] );
		$clean['ollama_base_url']   = esc_url_raw( $input['ollama_base_url'] ?? $clean['ollama_base_url'] );
		$clean['ollama_model']      = sanitize_text_field( $input['ollama_model'] ?? $clean['ollama_model'] );
		$clean['custom_api_base']   = esc_url_raw( $input['custom_api_base'] ?? '' );
		$clean['custom_model']      = sanitize_text_field( $input['custom_model'] ?? '' );
		$clean['widget_title']      = sanitize_text_field( $input['widget_title'] ?? $clean['widget_title'] );
		$clean['widget_subtitle']   = sanitize_text_field( $input['widget_subtitle'] ?? $clean['widget_subtitle'] );
		$clean['welcome_message']   = sanitize_textarea_field( $input['welcome_message'] ?? $clean['welcome_message'] );
		$clean['ai_system_prompt']  = sanitize_textarea_field( $input['ai_system_prompt'] ?? $clean['ai_system_prompt'] );
		$clean['poll_interval']     = max( 2000, min( 15000, (int) ( $input['poll_interval'] ?? 3000 ) ) );
		$clean['rate_limit_max']    = max( 5, min( 100, (int) ( $input['rate_limit_max'] ?? 20 ) ) );
		$clean['rate_limit_window'] = max( 30, min( 300, (int) ( $input['rate_limit_window'] ?? 60 ) ) );
		$clean['ai_history_limit']  = max( 2, min( 20, (int) ( $input['ai_history_limit'] ?? 8 ) ) );

		// Secrets: keep existing value when field left blank (password inputs).
		$clean['telegram_bot_token'] = self::sanitize_secret( $input['telegram_bot_token'] ?? '', $current['telegram_bot_token'] ?? '' );
		$clean['openai_api_key']     = self::sanitize_secret( $input['openai_api_key'] ?? '', $current['openai_api_key'] ?? '' );
		$clean['anthropic_api_key']  = self::sanitize_secret( $input['anthropic_api_key'] ?? '', $current['anthropic_api_key'] ?? '' );
		$clean['custom_api_key']     = self::sanitize_secret( $input['custom_api_key'] ?? '', $current['custom_api_key'] ?? '' );

		return $clean;
	}

	private static function sanitize_secret( string $new, string $existing ): string {
		$new = trim( $new );
		if ( '' === $new ) {
			return $existing;
		}
		return sanitize_text_field( $new );
	}

	public static function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$s = self::get_settings();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Timekairos Chat', 'timekairos-chat' ); ?></h1>
			<p><?php esc_html_e( 'Віджет чату для WordPress. Токени та API-ключі зберігаються лише на сервері.', 'timekairos-chat' ); ?></p>

			<form method="post" action="options.php">
				<?php settings_fields( 'timekairos_chat_group' ); ?>

				<h2><?php esc_html_e( 'Загальні', 'timekairos-chat' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Увімкнути віджет', 'timekairos-chat' ); ?></th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[enabled]" value="1" <?php checked( $s['enabled'], 1 ); ?>></label></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Режим відповіді', 'timekairos-chat' ); ?></th>
						<td>
							<select name="<?php echo esc_attr( self::OPTION_KEY ); ?>[response_mode]">
								<option value="telegram" <?php selected( $s['response_mode'], 'telegram' ); ?>><?php esc_html_e( 'Лише Telegram (менеджери)', 'timekairos-chat' ); ?></option>
								<option value="ai" <?php selected( $s['response_mode'], 'ai' ); ?>><?php esc_html_e( 'Лише AI', 'timekairos-chat' ); ?></option>
								<option value="hybrid" <?php selected( $s['response_mode'], 'hybrid' ); ?>><?php esc_html_e( 'Гібрид: AI + Telegram', 'timekairos-chat' ); ?></option>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Інтервал опитування (мс)', 'timekairos-chat' ); ?></th>
						<td><input type="number" min="2000" max="15000" step="500" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[poll_interval]" value="<?php echo esc_attr( (string) $s['poll_interval'] ); ?>"></td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Telegram', 'timekairos-chat' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Bot Token', 'timekairos-chat' ); ?></th>
						<td>
							<input type="password" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[telegram_bot_token]" value="" autocomplete="new-password" placeholder="<?php echo esc_attr( self::mask_secret( $s['telegram_bot_token'] ) ); ?>">
							<p class="description"><?php esc_html_e( 'Залиште порожнім, щоб не змінювати збережений токен.', 'timekairos-chat' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Chat ID', 'timekairos-chat' ); ?></th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[telegram_chat_id]" value="<?php echo esc_attr( $s['telegram_chat_id'] ); ?>" placeholder="-1001234567890"></td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Штучний інтелект', 'timekairos-chat' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Увімкнути AI', 'timekairos-chat' ); ?></th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[ai_enabled]" value="1" <?php checked( $s['ai_enabled'], 1 ); ?>></label></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Провайдер', 'timekairos-chat' ); ?></th>
						<td>
							<select name="<?php echo esc_attr( self::OPTION_KEY ); ?>[ai_provider]" id="tk-ai-provider">
								<option value="openai" <?php selected( $s['ai_provider'], 'openai' ); ?>>OpenAI API</option>
								<option value="anthropic" <?php selected( $s['ai_provider'], 'anthropic' ); ?>>Anthropic API</option>
								<option value="ollama" <?php selected( $s['ai_provider'], 'ollama' ); ?>>Ollama (локально)</option>
								<option value="custom" <?php selected( $s['ai_provider'], 'custom' ); ?>>Custom OpenAI-compatible API</option>
							</select>
						</td>
					</tr>
					<tr class="tk-row-openai">
						<th scope="row">OpenAI API Key</th>
						<td><input type="password" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[openai_api_key]" value="" placeholder="<?php echo esc_attr( self::mask_secret( $s['openai_api_key'] ) ); ?>"></td>
					</tr>
					<tr class="tk-row-openai">
						<th scope="row">OpenAI Model</th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[openai_model]" value="<?php echo esc_attr( $s['openai_model'] ); ?>"></td>
					</tr>
					<tr class="tk-row-anthropic">
						<th scope="row">Anthropic API Key</th>
						<td><input type="password" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[anthropic_api_key]" value="" placeholder="<?php echo esc_attr( self::mask_secret( $s['anthropic_api_key'] ) ); ?>"></td>
					</tr>
					<tr class="tk-row-anthropic">
						<th scope="row">Anthropic Model</th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[anthropic_model]" value="<?php echo esc_attr( $s['anthropic_model'] ); ?>"></td>
					</tr>
					<tr class="tk-row-ollama">
						<th scope="row">Ollama URL</th>
						<td><input type="url" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[ollama_base_url]" value="<?php echo esc_attr( $s['ollama_base_url'] ); ?>"></td>
					</tr>
					<tr class="tk-row-ollama">
						<th scope="row">Ollama Model</th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[ollama_model]" value="<?php echo esc_attr( $s['ollama_model'] ); ?>"></td>
					</tr>
					<tr class="tk-row-custom">
						<th scope="row">Custom API Base URL</th>
						<td><input type="url" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[custom_api_base]" value="<?php echo esc_attr( $s['custom_api_base'] ); ?>" placeholder="https://api.example.com/v1"></td>
					</tr>
					<tr class="tk-row-custom">
						<th scope="row">Custom API Key</th>
						<td><input type="password" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[custom_api_key]" value="" placeholder="<?php echo esc_attr( self::mask_secret( $s['custom_api_key'] ) ); ?>"></td>
					</tr>
					<tr class="tk-row-custom">
						<th scope="row">Custom Model</th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[custom_model]" value="<?php echo esc_attr( $s['custom_model'] ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'System prompt', 'timekairos-chat' ); ?></th>
						<td><textarea class="large-text" rows="4" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[ai_system_prompt]"><?php echo esc_textarea( $s['ai_system_prompt'] ); ?></textarea></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Історія повідомлень (пар)', 'timekairos-chat' ); ?></th>
						<td><input type="number" min="2" max="20" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[ai_history_limit]" value="<?php echo esc_attr( (string) $s['ai_history_limit'] ); ?>"></td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Віджет', 'timekairos-chat' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Заголовок', 'timekairos-chat' ); ?></th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[widget_title]" value="<?php echo esc_attr( $s['widget_title'] ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Підзаголовок', 'timekairos-chat' ); ?></th>
						<td><input type="text" class="regular-text" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[widget_subtitle]" value="<?php echo esc_attr( $s['widget_subtitle'] ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Вітальне повідомлення', 'timekairos-chat' ); ?></th>
						<td><textarea class="large-text" rows="2" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[welcome_message]"><?php echo esc_textarea( $s['welcome_message'] ); ?></textarea></td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Безпека', 'timekairos-chat' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Ліміт запитів / IP', 'timekairos-chat' ); ?></th>
						<td><input type="number" min="5" max="100" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[rate_limit_max]" value="<?php echo esc_attr( (string) $s['rate_limit_max'] ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Вікно ліміту (сек)', 'timekairos-chat' ); ?></th>
						<td><input type="number" min="30" max="300" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[rate_limit_window]" value="<?php echo esc_attr( (string) $s['rate_limit_window'] ); ?>"></td>
					</tr>
				</table>

				<?php submit_button(); ?>
			</form>

			<p><em><?php esc_html_e( 'Розроблено Timekairos', 'timekairos-chat' ); ?></em></p>
		</div>
		<script>
		(function () {
			var sel = document.getElementById('tk-ai-provider');
			if (!sel) return;
			function toggle() {
				var v = sel.value;
				document.querySelectorAll('[class*="tk-row-"]').forEach(function (row) {
					row.style.display = 'none';
				});
				document.querySelectorAll('.tk-row-' + v).forEach(function (row) {
					row.style.display = '';
				});
			}
			sel.addEventListener('change', toggle);
			toggle();
		})();
		</script>
		<?php
	}

	private static function mask_secret( string $value ): string {
		if ( ! $value ) {
			return '';
		}
		$len = strlen( $value );
		if ( $len <= 8 ) {
			return str_repeat( '•', $len );
		}
		return substr( $value, 0, 4 ) . str_repeat( '•', min( 12, $len - 8 ) ) . substr( $value, -4 );
	}
}
