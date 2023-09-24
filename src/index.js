const port = process.env.PORT || 8080;
const http = require('http');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
var pv = 0
var load = 0
const SOLARURL = `https://monitoringapi.solaredge.com/site/974187/currentPowerFlow?api_key=${process.env.SOLAR_API}`;
const LOCATIONURL = `https://api.tessie.com/${process.env.VIN}/location?access_token=${process.env.TESSIE_API}`;
const STATEURL = `https://api.tessie.com/${process.env.VIN}/state?access_token=${process.env.TESSIE_API}`;
const STOPCHARGINGURL = `https://api.tessie.com/${process.env.VIN}/command/stop_charging?access_token=${process.env.TESSIE_API}`;
const SETLIMITURL = `https://api.tessie.com/${process.env.VIN}/command/set_charge_limit?access_token=${process.env.TESSIE_API}&percent=80`;

var chargeRate = 0
var isCharging = false
var currentChargeLimit;
const server = http.createServer((req, res) => {
    res.write('Hello World');
    res.end();
})

server.listen(port,function(error) {
    if (error) {
        console.error(error);
    } else {
        console.info(`Server is listening on port ${port}`);

    }
});
// run an http get request to the url every 15 mins
setInterval(() => {
    time = Date.now;
    if (time.getHours() < 20 && time.getHours() > 6) {
        axios.get(LOCATIONURL)
    .then(response => {
        location = response.data.saved_location
        if(location == "Home") {
            console.log("Getting State")
            GetState();
        }
        
    })
    }
    
           
}, 300000);

// adjust power limit and then start charging at certain power
function StartCharging() {
    // adjusts charge limit and sets charge power
    console.log("Started Charging")
    axios.get(SETLIMITURL)
}
// request Tessie to stop charging the car
function StopCharging() {
    console.log("stopped charging")
    axios.get(STOPCHARGINGURL)
}
// adjusts car charging rate based on power
function AdjustPower() {
    console.log("adjusting power")
    if(pv - load > 0) {
        if(!isCharging) {
            
            StartCharging();
        }
        chargeRate += Math.round((pv - load) / 0.2)
        var SETAMPSURL = `https://api.tessie.com/${process.env.VIN}/command/set_charging_amps?access_token=${process.env.TESSIE_API}&amps=${chargeRate}`
        axios.get(SETAMPSURL)
        console.log("changed charge rate to:" + chargeRate)
    } else {
        chargeRate += Math.round((pv - load) / 0.2);
        if(chargeRate <= 0) {
            StopCharging();
        }
        console.log("changed charge rate to:" + chargeRate)
    }
    
}
// gets the power from solaredge
function GetPower() {
    axios.get(SOLARURL)
        .then(response => {
            data = response.data.siteCurrentPowerFlow
            pv = data.PV.currentPower
            load = data.LOAD.currentPower
        })
    if(Math.abs(pv - load) > 0.2) {
        AdjustPower()
    } else {
        console.log("power too low")
    }
}
// if the car is home get state is called which will tell the rest of the code whether it can charge or not
function GetState() {
    axios.get(STATEURL)
    .then(response => {
        var chargeData = response.data.charge_state
        var batteryCharge = chargeData.battery_level
        var charging = chargeData.charging_state
        currentChargeLimit = chargeData.charge_limit_soc
        if(charging != "Charging") {
            isCharging = false
        } else {
            isCharging = true
        }
        if(charging == "Disconnected") {
            console.log("not plugged in")
            return;
        }
        
            if(batteryCharge < 50) {
                console.log("battery too low")
                return;
            }
            if(batteryCharge >= 80) {
                console.log("battery too high")
                return;
            }
        console.log("getting power")
        GetPower();
    })
}