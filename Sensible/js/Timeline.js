var Timeline;

Timeline = (function () {
    function Timeline(timelineData, webchartRef) {
        this.width = 1100;
        this.height = 350;
        this.data = DataProcessor.parse_timeline_data(timelineData);
        this.highlightedData = [[], [], []];
        this.svg = d3.select("#timeline").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_timeline").style("display", "inline-block");
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.baseUrl = "http://localhost:5777/Sensible/data";
        this.webchartRef = webchartRef;
        this.shapes = {
            call: "04,00 08,04 05,07 05,08 13,16 14,16 17,13 21,16 17,21 12,21 00,09 00,04 04,00",
            sms: "00,00 25,00 25,15 00,15 00,00 13,7 25,00",
            bt: "00,07 05,10 05,00 12,05 05,10 12,15 05,20 05,10 00,13"
        };       

        var date = new Date(Date.now());
        this.ending = new Date(Date.now());
        this.ending.setHours(0);
        this.ending.setMinutes(0);
        this.starting = new Date(date.setMonth(date.getMonth() - 5));
        date = new Date(Date.now());
        this.brushInit = new Date(date.setMonth(date.getMonth() - 3));

        this.xscale = d3.time.scale().range([0, this.width]).domain([this.starting, this.ending]);
        this.yscale = {};
        this.xAxis = d3.svg.axis().scale(this.xscale).orient("bottom");

        var newDate = new Date();
        this.barInterval = this.xscale(new Date()) - this.xscale((new Date()).setDate(newDate.getDate() - 1)) - 1;

        this.brush = null;
        this.label = null;


        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < this.data[i].length; j++) {
                this.highlightedData[i].push({ date: this.data[i][j].date, x: this.data[i][j].x, y: 0 });
            }
        }


        // this.draw_buttons();
        this.draw_symbols();
        this.draw_calendar("bt", 0);
        this.draw_calendar("sms", 110);
        this.draw_calendar("call", 220);
    };

    Timeline.prototype.draw_symbols = function () {
        var chart = this;
        var symbols = this.svg
            .append("g")
            .attr("id", "legend")
            .selectAll(".barlegend").data(["bt", "sms", "call"]).enter()
            .append("g")
            .attr("class", "barlegend")
            .attr("transform", function (d, i) {
                return "translate(1110," + (i * 110 + 10) + ")";
            });



        symbols.append("polyline")
        .attr("transform", function (d, i) {
            switch (i) {
                case 0:
                    return "translate(5, 5)";
                case 1:
                    return "translate(3, 7)";
                case 2:
                    return "translate(7, 4)";
            }
        })
        .attr("stroke", function (d) {
            return chart.colors[d];
        })
        .style("stroke-width", "2px")
        .style("fill", "none")
        .attr("points", function (d) {
            return chart.shapes[d];
        });

        var button, button_text;
        var group = this.svg.append("g")
            .attr("id", "button-clear")
            .attr("transform", "translate(1150, 300)")
            .style("visibility", "hidden")
            .on("click", function () {
                chart.clear_all_selected();
            })
            .on("mouseover", function () {
                button.attr("fill", "#B1B1B1");
            })
            .on("mouseout", function () {
                button.attr("fill", "#dddddd");
            });

        button = group.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 110)
            .attr("height", 30)
            .attr("fill", "#dddddd")
            .attr("stroke", "#aaaaaa")
            .attr("stroke-width", 0.25)
            .style("cursor", "hand");

        button_text = group.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .style("cursor", "hand")
            .style("font-family", "Segoe UI")
            .style("font-size", "20px")
            .style("font-variant", "small-caps")
            .style("font-weight", "bold")
            .text("Clear All");
    };

    // calendar chart
    Timeline.prototype.draw_calendar = function (mode, translation) {
        var chart = this;
        this.mode = mode;
       // d3.selectAll(".barchart").remove();
        
        var toLabel = ["call", "sms", "bt"]
        var barPadding = 1;
        var dataToDraw;

        switch (mode) {
            case "bt":
                dataToDraw = chart.data[2];
                break;
            case "sms":
                dataToDraw = chart.data[1];
                break;
            case "call":
                dataToDraw = chart.data[0];
                break;
        }
        
        var w = 1000,
            h = 70;       

        this.yscale[mode] = d3.scale.linear().range([h, 0]).domain([0, d3.max(dataToDraw.map(function (d) { return d.y; }))]);

        if (this.brush == null) {
            this.brush = d3.svg.brush()
            .x(chart.xscale)
            .on("brush", brushed)
            .on("brushend", brushend)
            .extent([this.brushInit, this.ending]);
        }

        var barGrp = chart.svg.append("g")
        .attr("id", "timelineBars-" + mode)
        .attr("class", "barchart")
        .attr("transform", "translate(0," + translation + ")");

        barGrp.selectAll("rect")
            .data(dataToDraw)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("width", this.barInterval)
            .attr("class", "bar")
            .attr("transform", function (d) {
                return "translate(" + chart.xscale(d.date) + ",7)";
            })
            .style("fill", function (d, i) {
                return chart.colors[mode];
            })
            .attr("height", 0)
            .transition()
            .delay(function (d, i) { return i * 5; })
            .attr("y", function (d) { return chart.yscale[mode](d.y) })
            .attr("height", function (d) {
                return h - chart.yscale[mode](d.y);
            });

        barGrp.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + 80 + ")")
            .call(this.xAxis);

        barGrp.append("g")
            .attr("class", "x brush")
            .call(this.brush)
          .selectAll("rect")
            .attr("y", 5)
            .attr("height", 100 + 7);

        if (mode == "call") {
            this.label = barGrp.append("svg:text")
                .attr("x", 500)
                .attr("y", 5)
                .attr("text-anchor", "middle")
                .attr("id", "dates")
                .text(this.brush.extent()[0].toDateString().split(" ")[1] + " " + this.brush.extent()[0].toDateString().split(" ")[2]
                    + "  -  " + this.brush.extent()[1].toDateString().split(" ")[1] + " " + this.brush.extent()[1].toDateString().split(" ")[2])
                .attr("transform", "translate(100," + 145 + ")");
        }

        function brushed() {
            var x0 = d3.select(this).select(".extent").attr("x"), x1 = d3.select(this).select(".extent").attr("width");
            chart.svg.selectAll(".extent").attr("x", x0).attr("width", x1);
            chart.label.text(chart.brush.extent()[0].toDateString().split(" ")[1] + " " + chart.brush.extent()[0].toDateString().split(" ")[2]
                + "  -  " + chart.brush.extent()[1].toDateString().split(" ")[1] + " " + chart.brush.extent()[1].toDateString().split(" ")[2])
            .attr("transform", "translate(100," + 145 + ")");
        }

        function brushend() {

            chart.webchartRef.startTime = chart.brush.extent()[0].valueOf() / 1000;
            chart.webchartRef.endTime = chart.brush.extent()[1].valueOf() / 1000;
            chart.webchartRef.update_nodes();
        }

    };

    Timeline.prototype.addPerson = function (data) {
        var ind = 0;
        var chart = this;
        var w = 1000,
            h = 70;
        var modes = ["call", "sms", "bt"];


        for (var i = 0; i < 3; i++) {
            var newItem = 0;
            for (var j = 0; j < this.data[i].length && newItem < data[i].length; j++) {
                if (this.highlightedData[i][j].date.valueOf() == data[i][newItem].date.valueOf()) {
                    this.highlightedData[i][j].y += data[i][newItem].count;
                    newItem++;
                }
            }
        }

        for (var ind = 0; ind < 3; ind++) {
            var mode = modes[ind];
            var barGrp = this.svg.select("#timelineBars-" + mode);

            barGrp.selectAll(".highlight")
                .data(this.highlightedData[ind], function (d) { return d.date })
                .enter()
                .append("rect")
                .attr("class", "highlight")
                .attr("x", 0)
                .attr("y", h)
                .attr("width", this.barInterval)
                .attr("transform", function (d) {
                    return "translate(" + chart.xscale(d.date) + ",7)";
                })
                .style("fill", "#ff0000")
                .attr("height", 0);

            barGrp.selectAll(".highlight")
                .transition()
                .attr("y", function (d) { return chart.yscale[mode](d.y) })
                .attr("height", function (d) {
                    return h - chart.yscale[mode](d.y);
                });

        }
        this.svg.select("#button-clear").style("visibility", "visible");
        this.svg.selectAll(".brush").each(function () {
            this.parentNode.appendChild(this);
        });
    };

    Timeline.prototype.removePerson = function (data) {
        var ind = 0;
        var chart = this;
        var w = 1000,
            h = 70;
        var modes = ["call", "sms", "bt"];

        for (var i = 0; i < 3; i++) {
            var newItem = 0;
            for (var j = 0; j < this.data[i].length && newItem < data[i].length; j++) {
                if (this.highlightedData[i][j].date.valueOf() == data[i][newItem].date.valueOf()) {
                    this.highlightedData[i][j].y -= data[i][newItem].count;
                    newItem++;
                }
            }
        }

        for (var ind = 0; ind < 3; ind++) {
            var mode = modes[ind];
            var barGrp = this.svg.select("#timelineBars-" + mode);

            barGrp.selectAll(".highlight")
                .transition()
                .attr("y", function (d) { return chart.yscale[mode](d.y) })
                .attr("height", function (d) {
                    return h - chart.yscale[mode](d.y);
                });

        }
        this.svg.select("#button-clear").style("visibility", "hidden");
    };

    Timeline.prototype.clear_all_selected = function () {
        var chart = this.webchartRef;
        for (var i = 0; i < chart.displayedNodes.length; i++) {
            if (chart.displayedNodes[i].clicked) {
                chart.displayedNodes[i].clicked = false;
                chart.timelineRef.removePerson(chart.displayedNodes[i].colData.totals);
            }
        }
        chart.vis.selectAll("circle")
            .attr("fill", function (d) {
                return chart.colors[this.getAttribute("class")];
            })
            .attr("stroke", function (d) {
                return d3.rgb(chart.colors[this.getAttribute("class")]).darker();
            });
    };


    return Timeline;
})();