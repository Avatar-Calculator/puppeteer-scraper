import mongoose from 'mongoose'

export module Database {
    export const connect = async () => {
        try {
            if(process.env.PROD) {
                const conn = await mongoose.connect(process.env.PROD, {
                    autoIndex: false,
                    socketTimeoutMS: 5000,
                    maxPoolSize: 25,
                });
                console.log('MongoDB Connected: ' + conn.connection.host);
            }
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
}