import dotenv from 'dotenv'
import cron from 'node-cron'

import { Database } from './config/db'
import { Avatars } from './models/avatar'
import { Scraper } from './scrape'

dotenv.config();
Database.connect();

initCron();

//Every 30 minutes
async function initCron() {
    //grab all collections here
    const data = await Avatars.find({});

    Scraper.scrapeAvatarPrices(data);
    cron.schedule('*/30 * * * *', () => { Scraper.scrapeAvatarPrices(data) });
}