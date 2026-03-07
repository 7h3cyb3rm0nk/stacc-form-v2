require("dotenv").config();

const express=require("express");
const cors=require("cors");
const pool=require("./db");
const {Parser}= require("json2csv");

const app=express();

const ADMIN_KEY=process.env.ADMIN_KEY;

app.use(cors());
app.use(express.json());

app.get("/api/health",(req,res)=>{
    res.json({status:"API is running"});
});

app.post("/api/registrations",async(req,res)=>{
    try{
        const{
            name,
            email,
            phone,
            distro,
            space_check,
            usb_check,
            linux_familiarity,
            cmd_familiarity,
            bash_workshop,
        }=req.body;

        const result=await pool.query(
            `INSERT INTO registrations 
            (name,email,phone,distro,space_check,usb_check,linux_familiarity,cmd_familiarity,bash_workshop)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [name,email,phone,distro,space_check,usb_check,linux_familiarity,cmd_familiarity,bash_workshop]

        
        );

        res.status(201).json({
            success:true,
            message:"Registration successful",
            data:result.rows[0],
        });
        }catch(error){
            console.error("Registration error:",error);

            res.status(500).json({
                success:false,
                message:"Server error",
            });

        }
    });

    const PORT=process.env.PORT || 5000;

    

    app.get("/api/admin/export",async(req,res)=>{

        const key=req.query.key;

        if(key!==ADMIN_KEY){
            return res.status(403).json({
                message:"Unauthorized access"
            });
        }

        try{

            const result=await pool.query(
                "SELECT * FROM registrations ORDER BY created_at DESC"
            );

            const registrations =result.rows;

            if(registrations.length ===0){
                return res.status(404).json({
                    message:"No registrations found"
                });
            }

            const fields=[
                "id",
                "name",
                "email",
                "phone",
                "distro",
                "space_check",
                "usb_check",
                "linux_familiarity",
                "cmd_familiarity",
                "bash_workshop",
                "created_at"
            ];

            const json2csv = new Parser({fields});

            const csv=json2csv.parse(registrations);

            res.header("Content-Type","text/csv");
            res.attachment("stacc_registrations.csv");

            return res.send(csv);

        } catch(error){
            console.error("CSV export error:",error);

            res.status(500).json({
                message:"Error generating CSV export"
            });
        }
    });
    app.listen(PORT,()=>{
        console.log(`server running on port ${PORT}`);
    });
