import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,{
  host: process.env.DB_HOST,
  port:5432,
  dialect: "postgres",
   logging: false, // Disables unnecessary Sequelize logs
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }

});


export default sequelize;
