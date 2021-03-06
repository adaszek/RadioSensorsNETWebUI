var bluebird = require("bluebird");
var moment = require("moment")

function parse_capabilities(to_parse, array_of_cap) {
    var temp_object = {};
    var temp_split = to_parse.split(";");
    for (var param in temp_split) {
        var arg_and_value = temp_split[param].split(":");
        if (arg_and_value[0] === "r" || arg_and_value[0] === "w") {
            var properties = arg_and_value[1].split(",");
            var result = [];
            if(properties.length > 1) {
                result = properties.map((x) => {
                    return array_of_cap[x];
                });
            }
            temp_object[arg_and_value[0]] = result;
        } else {
            temp_object[arg_and_value[0]] = arg_and_value[1];
        }
    }
    return temp_object;
}

function get_latest_activity(redis_client) {
    return redis_client
        .hgetallAsync("sensors:last_activity")
        .then(data => {
            for(var key in data) {
                data[key] = moment((parseInt(data[key]) * 1000));
            }
            return data;
        });
}

function get_init_data(redis_client) {
    return redis_client
        .multi()
        .smembers("sensors")
        .hgetall("sensors:functions")
        .hgetall("sensors:last_location")
        .hgetall("functions")
        .execAsync()
        .then((data) => {
            var return_array = [];
            for(var i in data[0]) {
                var row = [];
                row.push(data[0][i]);

                if (data[0][i] in data[1]) {
                    row.push(parse_capabilities(data[1][data[0][i]], data[3]));
                } else {
                    row.push(null);
                }
                if (data[2].hasOwnProperty(data[0][i])) {
                    row.push(data[2][data[0][i]]);
                } else {
                    row.push(null);
                }

                return_array.push(row);
            }
            return return_array;
        })
        .catch(e => {
            console.log(e);
        });
}


module.exports = () => {
    var express = require('express');
    var router = express.Router();
    var redis = require("redis");

    bluebird.promisifyAll(redis.RedisClient.prototype);
    bluebird.promisifyAll(redis.Multi.prototype);

    var client = redis.createClient(6379, "192.168.1.158")

    client.onAsync("connect", () => {
        console.log("connected")
    })

    router.get('/', function(req, res, next) {
        res.render('devices', { title: 'Devices' });
    });

    router.get('/api', function(req, res, next) {
        bluebird.join(get_init_data(client), get_latest_activity(client), (init_data, latest_activity) => {
            for(var sid in latest_activity) {
                var row = init_data.find((element, index) => {
                    return element[0] === sid;
                });
                row.push(latest_activity[sid]);
                row.push("status");
            }
            res.send({ data: init_data });
        });
    });

    return router;
};

