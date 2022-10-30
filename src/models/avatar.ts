import mongoose from 'mongoose'

const Schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    floor_price: {
        type: Number,
        required: true
    },
    floor_price_change: {
        type: Number,
        required: false
    },
    generation: {
        type: String,
        required: true
    },
    hyperlink: {
        type: String,
        required: true
    },
    last_sale: {
        type: Number,
        required: true
    },
    last_sale_change: {
        type: Number,
        required: false
    },
    //for an edge case if default scrape returns another result
    //Example: Searching for Joy Kawaii Material Girl returns Joy Kawaii Cowgirl
    search_term: { 
        type: String,
        required: false
    }
})

export const Avatars = mongoose.model('Avatar', Schema);