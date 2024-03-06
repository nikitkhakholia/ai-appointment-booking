const express = require('express')
const { createDoctor, getDoctors, addAvailableAppointments, getAvailableAppointments } = require('../Controllers/doctor.controller')
const router = express.Router()

// define the home page route
router.post('/add', (req, res, next) => {
    let { name, hospital, experience, degrees, } = req.body

    if (!name) return res.status(400).json({ message: "Name is required." })
    if (!hospital) return res.status(400).json({ message: "Hospital is required." })
    if (!experience || !parseFloat(experience)) return res.status(400).json({ message: "Experience in years is required." })
    if (!degrees?.length) return res.status(400).json({ message: "Atleast 1 degree in required." })
    next()
}, createDoctor)
router.get("/", getDoctors)

router.put("/addAppointment", (req, res, next) => {
    let { date, _id } = req.body
    if (!date) return res.status(400).json({ message: "Date is required." })
    if (!_id) return res.status(400).json({ message: "Your id is required." })
    next()

}, addAvailableAppointments)
router.get("/appointments", getAvailableAppointments)

module.exports = router