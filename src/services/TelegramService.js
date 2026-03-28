'use strict';

/**
 * C-LIMID | Telegram Reporting Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses the Telegraf library to send formatted execution reports and screenshots
 * to an admin Telegram account.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.adminId  = process.env.TELEGRAM_ADMIN_ID;

    if (!this.botToken || !this.adminId) {
      console.warn('[C-LIMID Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_ID not set. Telegram reporting is disabled.');
      this.bot = null;
    } else {
      this.bot = new Telegraf(this.botToken);
    }
  }

  // ─── Interactive Bot Controls ───────────────────────────────────────────────
  
  startBot() {
    if (!this.bot) return;

    // Check admin authorization
    const isAdmin = (ctx) => ctx.from && ctx.from.id.toString() === this.adminId;

    this.bot.command('status', async (ctx) => {
      if (!isAdmin(ctx)) return;
      try {
        const { validationQueue } = require('../queue/validationQueue');
        const counts = await validationQueue.getJobCounts();
        ctx.reply(`📊 *Queue Status:*\n• Waiting: ${counts.waiting}\n• Active: ${counts.active}\n• Completed: ${counts.completed}\n• Failed: ${counts.failed}`, { parse_mode: 'Markdown' });
      } catch (err) {
        ctx.reply(`❌ Error getting status: ${err.message}`);
      }
    });

    this.bot.command('start_audit', async (ctx) => {
      if (!isAdmin(ctx)) return;
      try {
        const { dispatchAll } = require('./DispatcherService');
        const res = await dispatchAll();
        ctx.reply(`🚀 *Audit Started!*\n${res.message}`, { parse_mode: 'Markdown' });
      } catch (err) {
        ctx.reply(`❌ Dispatch Error: ${err.message}`);
      }
    });

    this.bot.command('add_acc', async (ctx) => {
      if (!isAdmin(ctx)) return;
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length < 2) return ctx.reply('Usage: `/add_acc [email] [password]`', { parse_mode: 'Markdown' });
      const [accountEmail, password] = args;
      try {
        const VaultService = require('./VaultService');
        const vault = new VaultService();
        await vault.store(accountEmail, { password, targetUrl: 'https://one.google.com' });
        ctx.reply(`🔐 Account \`${accountEmail}\` encrypted and added to the vault.`, { parse_mode: 'Markdown' });
      } catch (err) {
        ctx.reply(`❌ Failed to store account: ${err.message}`);
      }
    });

    this.bot.command('stop', async (ctx) => {
      if (!isAdmin(ctx)) return;
      try {
        const { validationQueue } = require('../queue/validationQueue');
        await validationQueue.pause();
        ctx.reply('🛑 *Worker paused* gracefully. Queue traffic stopped.', { parse_mode: 'Markdown' });
      } catch (err) {
        ctx.reply(`❌ Failed to pause queue: ${err.message}`);
      }
    });

    // Handle generic errors in Telegraf to prevent crashes
    this.bot.catch((err, ctx) => {
      console.error(`[C-LIMID Telegram] Bot error for ${ctx.updateType}:`, err);
    });

    this.bot.launch();
    console.log('[C-LIMID Telegram] Interactive Bot is running and waiting for commands.');

    // Graceful stop for telegraf
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  /**
   * Send a formatted report after a Playwright simulation.
   *
   * @param {Object} report
   * @param {string} report.accountEmail
   * @param {string} report.status       - 'Success', 'Failed', 'Action Required'
   * @param {string} report.promoLink
   * @param {Buffer} report.screenshotBuf
   */
  async sendReport({ accountEmail, status, promoLink, screenshotBuf }) {
    if (!this.bot) {
      console.log(`[C-LIMID Telegram] Report for ${accountEmail} skipped (Bot disabled).`);
      return;
    }

    try {
      const emojiMap = {
        'Eligible': '✅',
        'Not Eligible': '❌',
        'Action Required': '⚠️',
      };
      
      const statusEmoji = emojiMap[status] || 'ℹ️';
      
      const caption = `
📌 *Account:* ${accountEmail}
🛡️ *Status:* ${statusEmoji} ${status}
🔗 *Promo Link:* ${promoLink || 'None'}
      `.trim();

      if (screenshotBuf) {
        await this.bot.telegram.sendPhoto(
          this.adminId, 
          { source: screenshotBuf }, 
          { caption, parse_mode: 'Markdown' }
        );
      } else {
        await this.bot.telegram.sendMessage(
          this.adminId, 
          caption, 
          { parse_mode: 'Markdown' }
        );
      }
      console.log(`[C-LIMID Telegram] Successfully sent report for ${accountEmail}`);
    } catch (err) {
      console.error(`[C-LIMID Telegram] Failed to send report for ${accountEmail}:`, err.message);
    }
  }
}

module.exports = new TelegramService();
