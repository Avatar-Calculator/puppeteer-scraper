import dotenv from 'dotenv'

import { Database } from '../config/db'
import { Avatars } from './avatar'

dotenv.config();
Database.connect();

//FOLLOW THIS FORMAT TO POPULATE THE DATABASES
//  ["imagination-station-x-reddit-collectible-avatars", ["Big City Bear", "Cone Head", "Kid Rexie"]],
const slugs_with_tiers = new Map([
    ["imagination-station-x-reddit-collectible-avatars", ["Big City Bear", "Cone Head", "Kid Rexie"]]
]);
const generation = "Generation X";

export module Populator {
    export async function populate() {
        for(const [slug, tiers] of slugs_with_tiers) {
            for(const tier of tiers) {
                const avatar = await Avatars.findOne({ name: tier, slug: slug });
                if(!avatar) {
                    new Avatars({
                        name: tier,
                        slug: slug,
                        floor_price: 0,
                        generation: generation,
                        last_sale: 0
                    }).save()
                }
            }
        }
        console.log("Completed population");
    }
}