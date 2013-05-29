var Timeline;

Timeline = (function () {
    function Timeline(token) {
        this.width = 1200;
        this.height = 200;
        this.token = token;
        this.btdata = null;
        this.smsdata = null;
        this.calldata = null;
        this.svg = null;
        this.baseUrl = "http://localhost:5777/Sensible/data"
        this.load_data();

    };


    // calendar chart
    Timeline.prototype.draw_calendar = function () {
        var chart = this;
        this.svg= d3.select("#timeline").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_vis").style("display", "inline-block");

        var x = d3.time.scale().range([0, chart.width - 200]),
            y = d3.scale.linear().range([100, 0]);

        var xAxis = d3.svg.axis().scale(x).orient("bottom");

        var brush = d3.svg.brush()
            .x(x)
            .on("brush", brushed);


        var area = d3.svg.area()
            .interpolate("monotone")
            .x(function (d) { return x(d.date); })
            .y0(100)
            .y1(function (d) { return y(d.btcount); });

       

        var context = chart.svg.append("g")
            .attr("transform", "translate(" + 50 + "," + (chart.height - 120) + ")");

        var dProcessor = new DataProcessor();
        var data = dProcessor.gen_timeline_date(chart.btData, chart.smsData, chart.callData);


        x.domain(d3.extent(data.map(function (d) { return d.date; })));
        y.domain([0, d3.max(data.map(function (d) { return d.btcount; }))]);

        context.append("path").attr("id", "calendar")
            .datum(data)
            .attr("d", area);

        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + 100 + ")")
            .call(xAxis);

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
          .selectAll("rect")
            .attr("y", -6)
            .attr("height", 100 + 7);

        function brushed() {
            
        }
    };


    Timeline.prototype.load_data = function () {
        var chart = this;
        var remaining = 3;
        var runOnce = [false, false, false];

        //Load Call probe data
        d3.json(chart.baseUrl + "/call_log/" + chart.token, function (data) {
            if (!runOnce[0]) {
                runOnce[0] = true;
                chart.callData = data;
                if (! --remaining)
                    chart.draw_calendar();
            }
        });
        //Load SMS probe data
        d3.json(chart.baseUrl + "/sms/" + chart.token, function (data) {

            if (!runOnce[1]) {
                runOnce[1] = true;
                chart.smsData = data;
                if (! --remaining)
                    chart.draw_calendar();
            }
        });
        //Load Bluetooth probe data
        d3.json(chart.baseUrl + "/bluetooth/" + chart.token, function (data) {
            if (!runOnce[2]) {
                runOnce[2] = true;
                chart.btData = data;
                if (! --remaining)
                    chart.draw_calendar();
            }
        });
    };


    return Timeline;
})();