// @ts-nocheck
import { Cluster } from 'puppeteer-cluster'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

//NOTE: The scraper is HEAVILY inspired from https://github.com/dcts/opensea-scraper

puppeteer.use(StealthPlugin());

export module Scraper {
    export async function scrapeAvatarPrices(avatars: any) {
        await scrapeFloorPrice(avatars);
        await scrapeSalePrice(avatars);
        saveAvatarPrices(avatars);

        console.log("Completed price scraping at " + new Date().toISOString());
    }

    async function scrapeFloorPrice(avatars: any) {
        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 2,
            puppeteer,
            puppeteerOptions: {
                headless: true, //turn this to false if debugging puppeteer
                args: ['--start-maximized'],
            }
        });
    
        await cluster.task(async ({ page, data: avatar }) => {
            const offersUrl = `https://opensea.io/collection/${avatar.slug}?search[query]=${avatar.search_term ? encodeURIComponent(avatar.search_term) : encodeURIComponent(avatar.name)}&search[sortAscending]=true&search[sortBy]=PRICE&search[toggles][0]=BUY_NOW`;
            const offers = await offersByUrl(page, offersUrl);
            if(offers.length > 0) {
                const floorPrice = parseFloat(offers[0].floorPrice.amount).toFixed(5);
                if(avatar.floor_price !== 0)
                    avatar.floor_price_change = ((floorPrice - avatar.floor_price) / avatar.floor_price * 100).toFixed(2);
                avatar.floor_price = floorPrice
                console.log(avatar.name + " - FLOOR PRICE: " + avatar.floor_price);
            }
        });
    
        for(let avatar of avatars) {
            cluster.queue(avatar);
        }
    
        await cluster.idle();
        await cluster.close();
    }

    const lastXSales = 3;
    async function scrapeSalePrice(avatars: any) {
        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 2,
            puppeteer,
            puppeteerOptions: {
                headless: true, //turn this to false if debugging puppeteer
                args: ['--start-maximized'],
            }
        });
    
        await cluster.task(async ({ page, data: avatar }) => {
            const salesUrl = `https://opensea.io/collection/${avatar.slug}?search[query]=${avatar.search_term ? encodeURIComponent(avatar.search_term) : encodeURIComponent(avatar.name)}&search[sortAscending]=false&search[sortBy]=LAST_SALE_DATE`;
            const sales = await salesByUrl(page, salesUrl);
            if(sales.length > 0) {
                const amountToCalculate = sales.length < lastXSales ? sales.length : lastXSales;
                let sum = 0;
                for(let i = 0; i < amountToCalculate; i++) {
                    sum = sum + sales[i];
                }

                const lastSale = (sum / amountToCalculate).toFixed(5);
                if(avatar.last_sale !== 0)
                    avatar.last_sale_change = ((lastSale - avatar.last_sale) / avatar.last_sale * 100).toFixed(2);
                avatar.last_sale = lastSale;
                console.log(avatar.name + " - LAST SALES AVERAGE: " + avatar.last_sale);
            }
        });
    
        for(let avatar of avatars) {
            cluster.queue(avatar);
        }
    
        await cluster.idle();
        await cluster.close();
    }

    function saveAvatarPrices(avatars: any) {
        for(let avatar of avatars) {
            avatar.save();
        }
    }

    async function offersByUrl(page, url: string) {
        page.setRequestInterception(true);

        const blockedResourceTypes = ['image', 'stylesheet', 'font', 'script'];
        page.on('request', (request) => {
            if (request.resourceType() == 'script' && request.url().includes('cloudflare')) {
                return request.continue();
            }
            else if (blockedResourceTypes.includes(request.resourceType())) {
                return request.abort();
            }
            request.continue();
        });

        await page.goto(url);

        // ...🚧 waiting for cloudflare to resolve
        await page.waitForSelector('.cf-browser-verification', {hidden: true});

        // extract __wired__ variable
        const html = await page.content();
        const __wired__ = JSON.parse(html.split("window.__wired__=")[1].split("</script>")[0]);

        return _extractOffers(__wired__);
    }

    function _extractOffers(__wired__: object) {
        // get all floorPrices (all currencies)
        const floorPrices = Object.values(__wired__.records)
            .filter(o => o.__typename === "PriceType" && o.eth && o.unit && o.usd)
            .filter(o => o.eth)
            .map(o => {
              return {
                amount: o.eth,
                currency: 'ETH',
              }
            });
    
        // get offers
         const offers = Object.values(__wired__.records)
            .filter(o => o.__typename === "AssetType" && o.tokenId)
            .map(o => {
              return {
                name: o.name || o.tokenId || null, // tokenId as name if name===null (e.g. BoredApeYachtClub nfts do not have name)
              };
            });
    
        // merge information together:
        floorPrices.forEach((floorPrice, index) => {
            offers[index].floorPrice = floorPrice;
        });
            
        return offers;
    }

    async function salesByUrl(page, url: string) {
        page.setRequestInterception(true);

        const blockedResourceTypes = ['image', 'stylesheet', 'font', 'script'];
        page.on('request', (request) => {
            if (request.resourceType() == 'script' && request.url().includes('cloudflare')) {
                return request.continue();
            }
            else if (blockedResourceTypes.includes(request.resourceType())) {
                return request.abort();
            }
            request.continue();
        });

        await page.goto(url);

        // ...🚧 waiting for cloudflare to resolve
        await page.waitForSelector('.cf-browser-verification', {hidden: true});

        // ...🚧 waiting for some last sales with its specified currency to load
        await page.waitForSelector('.Price--amount', {
            timeout: 10000
        });

        const salesData = await page.$$eval('footer', els => {
            return els.map(e => {
                try {
                    return e.getElementsByClassName('Price--amount')[0].innerHTML.split("<!-- --> <!-- -->");
                }
                catch(err) {
                    return;
                }
            })
            .filter(e => {
                return e !== undefined;
            });
        });

        const sales = salesData.filter(e => {
            return e[1] === 'ETH';
        }).map(e => {
            return parseFloat(e[0].replace('&lt; ', '')); //If it's under 0.01, it might be < 0.01
        })

        return sales;
    }
}