require('dotenv').config()
const app = require('./src/app')
import connectDB from './src/config/db.js'
await connectDB()


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000')
})