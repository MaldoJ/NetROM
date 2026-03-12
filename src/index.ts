import 'dotenv/config';
import { createDiscordBotClient } from './transport/discord/discordBot.js';

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.log('NETROM transport idle. Set DISCORD_BOT_TOKEN to run the Discord bot.');
} else {
  const client = createDiscordBotClient();
  client.login(token);
}
