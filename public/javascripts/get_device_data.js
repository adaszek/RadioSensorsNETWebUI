/*
$("#sid").change(function(data) {
    check_selected_sensor();
});
*/
function get_data(param) {
    alert(param);
}

$(document).ready(function () {
    var socket = io("http://localhost:3000");

    var g3 = new Dygraph(document.getElementById("graphdiv3"), [], {
        dateWindow: [Date.now() - 60000 * 60 * 2, Date.now()],
        //drawPoints: true,
        fillGraph: true,
        //rollPeriod: 5,
        //showRoller: true,
        //showRangeSelector: true,
        labels: ['Time', 'Measurement']
    })


    function ask_for_data(sensor_id, measurement_id) {
        socket.emit('data_request', {
            "sid": sensor_id,
            "mid": measurement_id
        });
    }

    $("#type_selection_form").submit(function() {
        var sensor = $("#sid").find(":selected").text();
        var measurement = $("#mid").find(":selected").text();
        ask_for_data(sensor, measurement);
        return false;
    });

    socket.on('sensor_list', function(data) {
        $.each(data, function(key, value) {
            $("#sid")
                .append($("<option></option>")
                    .attr("value", key)
                    .text(value))
        });
        var sensor = $("#sid").find(":selected").text();
        var measurement = $("#mid").find(":selected").text();
        ask_for_data(sensor, measurement);
    });

    socket.on('data_response', function(data) {
        var array = [];
        for (var key in data) {
            array.push([
                new Date(parseInt(key) * 1000),
                parseFloat(data[key])
            ]);
        }
        g3.updateOptions({
            'file': array,
            dateWindow: [Date.now() - 60000 * 60 * 2, Date.now()]
        });
    });
});
