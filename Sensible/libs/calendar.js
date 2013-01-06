var Calendar;

Calendar = (function () {

    function Calendar() {
        this.startDate = new Date();
        this.startDate.setHours(0);
        this.startDate.setMinutes(0);
        this.startDate.setSeconds(0);
        this.startDate.setMonth(this.startDate.getMonth() - 1);

        this.endDate = new Date(Date.now());


        this.timeFormat = d3.time.format("%Y-%m-%d");
        this.width = 400;
        this.height = 800;
        this.svg = null;

        this.drawCalendar();
    };

    Calendar.prototype.drawCalendar = function () {
        var calendar = this;

        this.svg = d3.select("#vis-timeline").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_cal");

        var timestamp_button, timestamp_text;
        var timestamp_group = this.svg.append("g")
        .style("cursor", "default");

        timestamp_button = timestamp_group.append("rect")
		.attr("x", 10)
		.attr("y", 10)
		.attr("width", 90)
		.attr("height", 30)
		.attr("fill", "#aaaaaa")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25);

        timestamp_text = timestamp_group.append("text")
		.attr("x", 20)
		.attr("y", 30)
		.style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")

		.text("Timeframe");

        var button_start, start_text;
        var start = this.svg.append("g")
        .style("cursor", "hand")

		.on("click", function () {
		    if (chart) {
		        calendar.svg.selectAll(".yearsb").remove();
		        calendar.svg.selectAll(".monthsb").remove();
		        calendar.svg.selectAll(".daysb").remove();
		        calendar.drawYears(0);
		    }
		})
		.on("mouseover", function () {
		    button_start.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button_start.attr("fill", "#dddddd");
		});

        button_start = start.append("rect")
		.attr("id", "button_start")
		.attr("x", 10)
		.attr("y", 45)
		.attr("width", 90)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25);

        start_text = start.append("text")
		.attr("id", "start_text")
		.attr("x", 20)
		.attr("y", 65)
		.style("cursor", "hand")
		.style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")
		.text(calendar.timeFormat(calendar.startDate));

        var button_end, end_text;
        var end = this.svg.append("g")
        .style("cursor", "hand")
		.on("click", function () {
		    if (chart) {
		        calendar.svg.selectAll(".yearsb").remove();
		        calendar.svg.selectAll(".monthsb").remove();
		        calendar.svg.selectAll(".daysb").remove();
		        calendar.drawYears(1);
		    }
		})
		.on("mouseover", function () {
		    button_end.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button_end.attr("fill", "#dddddd");
		});

        button_end = end.append("rect")
		.attr("id", "button_end")
		.attr("x", 10)
		.attr("y", 80)
		.attr("width", 90)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25);

        end_text = end.append("text")
		.attr("id", "end_text")
		.attr("x", 20)
		.attr("y", 100)
		.style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")
		.text(calendar.timeFormat(calendar.endDate));
    };

    Calendar.prototype.drawYears = function (type) {
        var calendar = this;
        var modifiedDate = type == 0 ? this.startDate : this.endDate;
        var offset = type == 0 ? 45 : 80;
        var yearFormat = d3.time.format("%Y");

        this.svg.selectAll(".yearsb")
        .data(calendar.genYears(), function (d) {
            return d.year;
        }).enter()
        .append("g")
        .attr("class", "yearsb")
        .attr("transform", "translate(105)")
		.style("cursor", "hand")
		.on("click", function (d) {
		    if (type == 0) {
		        calendar.svg.selectAll("#by" + calendar.startDate.getFullYear())
                .attr("stroke", "#aaaaaa")
		        .attr("stroke-width", 0.25)
		        calendar.startDate.setFullYear(d.year);
		        calendar.svg.selectAll("#by" + calendar.startDate.getFullYear())
                .attr("stroke", "#7f1ac3")
                .attr("stroke-width", 1);
		    }
		    else {
		        calendar.svg.selectAll("#by" + calendar.endDate.getFullYear())
                .attr("stroke", "#aaaaaa")
		        .attr("stroke-width", 0.25)
		        calendar.endDate.setFullYear(d.year);
		        calendar.svg.selectAll("#by" + calendar.endDate.getFullYear())
                .attr("stroke", "#7f1ac3")
                .attr("stroke-width", 1);
		    }
		    calendar.svg.selectAll(".monthsb").remove();
		    calendar.svg.selectAll(".daysb").remove();
		    calendar.drawMonths(type);
		    calendar.updateText();
		})
		.on("mouseover", function (d) {
		    calendar.svg.select("#by" + d.year).attr("fill", "#B1B1B1");
		})
		.on("mouseout", function (d) {
		    calendar.svg.select("#by" + d.year).attr("fill", "#dddddd");
		});

        this.svg.selectAll(".yearsb").call(function () {
            this.append("rect")
		    .attr("id", function (d) {
		        return "by" + d.year;
		    })
		    .attr("x", 0)
		    .attr("y", offset)
		    .attr("width", 90)
		    .attr("height", 30)
		    .attr("fill", "#dddddd")
		    .attr("stroke", "#aaaaaa")
		    .attr("stroke-width", 0.25)
            .attr("transform", "scale(0,1)")
            .transition()
            .duration(1000)
            .attr("transform", "scale(1,1)")
            .each("end", function () {
                d3.select(this)
                .transition()
                .duration(1000)
                .attr("y", function (d) {
                    return (d.year - 2012) * 35 + offset;
                });
            });

            this.append("text")
		    .attr("x", 20)
		    .attr("y", offset + 20)
		    .style("font-family", "Segoe UI")
		    .style("font-size", "15px")
		    .style("font-variant", "small-caps")
            .text(function (d) {
                return yearFormat(d.date_obj);
            })
            .attr("transform", "scale(0,1)")
            .transition()
            .duration(1000)
            .attr("transform", "scale(1,1)")
            .each("end", function () {
                d3.select(this)
                .transition()
                .duration(1000)
                .attr("y", function (d) {
                    return (d.year - 2012) * 35 + offset + 20;
                });
            });

        });

        this.svg.selectAll("#by" + modifiedDate.getFullYear())
        .attr("stroke", "#7f1ac3")
        .attr("stroke-width", 1);
    };

    Calendar.prototype.drawMonths = function (type) {
        var calendar = this;
        var modifiedDate = type == 0 ? this.startDate : this.endDate;
        var offset = type == 0 ? 45 : 80;
        var monthFormat = d3.time.format("%B");

        this.svg.selectAll(".monthsb")
        .data(calendar.genMonths(modifiedDate.getFullYear()), function (d) {
            return d.month;
        }).enter()
        .append("g")
        .attr("transform", "translate(200,0)")
        .attr("class", "monthsb")
		.style("cursor", "hand")
		.on("click", function (d) {
		    if (type == 0) {
		        calendar.svg.selectAll("#bm" + calendar.startDate.getMonth())
                .attr("stroke", "#aaaaaa")
		        .attr("stroke-width", 0.25)
		        calendar.startDate.setMonth(d.month);
		        calendar.svg.selectAll("#bm" + calendar.startDate.getMonth())
                .attr("stroke", "#7f1ac3")
                .attr("stroke-width", 1);
		    }
		    else {
		        calendar.svg.selectAll("#bm" + calendar.endDate.getMonth())
                .attr("stroke", "#aaaaaa")
		        .attr("stroke-width", 0.25)
		        calendar.endDate.setMonth(d.month);
		        calendar.svg.selectAll("#bm" + calendar.endDate.getMonth())
                .attr("stroke", "#7f1ac3")
                .attr("stroke-width", 1);
		    }
		    calendar.svg.selectAll(".daysb").remove();
		    calendar.drawDays(type);
		    calendar.updateText();
		})
		.on("mouseover", function (d) {
		    calendar.svg.select("#bm" + d.month).attr("fill", "#B1B1B1");
		})
		.on("mouseout", function (d) {
		    calendar.svg.select("#bm" + d.month).attr("fill", "#dddddd");
		});

        this.svg.selectAll(".monthsb").call(function () {
            this.append("rect")
		    .attr("id", function (d) {
		        return "bm" + d.month;
		    })
		    .attr("x", 0)
		    .attr("y", offset)
		    .attr("width", 90)
		    .attr("height", 30)
		    .attr("fill", "#dddddd")
		    .attr("stroke", "#aaaaaa")
		    .attr("stroke-width", 0.25)
            .attr("transform", "scale(0,1)")
            .transition()
            .duration(1000)
            .attr("transform", "scale(1,1)")
            .each("end", function () {
                d3.select(this)
                .transition()
                .duration(1000)
                .attr("y", function (d) {
                    return d.month * 35 + offset;
                });
            });

            this.append("text")
		    .attr("x", 20)
		    .attr("y", offset + 20)
		    .style("font-family", "Segoe UI")
		    .style("font-size", "15px")
		    .style("font-variant", "small-caps")
            .text(function (d) {
                return monthFormat(d.date_obj);
            })
            .attr("transform", "scale(0,1)")
            .transition()
            .duration(1000)
            .attr("transform", "scale(1,1)")
            .each("end", function () {
                d3.select(this)
                .transition()
                .duration(1000)
                .attr("y", function (d) {
                    return d.month * 35 + offset + 20;
                });
            });

        });

        this.svg.selectAll("#bm" + modifiedDate.getMonth())
        .attr("stroke", "#7f1ac3")
        .attr("stroke-width", 1);


    };

    Calendar.prototype.drawDays = function (type) {
        var calendar = this;
        var modifiedDate = type == 0 ? this.startDate : this.endDate;
        var offset = type == 0 ? 45 : 80;
        var dayFormat = d3.time.format("%d");

        this.svg.selectAll(".daysb")
        .data(calendar.genDays(modifiedDate.getFullYear(), modifiedDate.getMonth()), function (d) {
            return d.day;
        }).enter()
        .append("g")
        .attr("class", "daysb")
        .attr("transform", "translate(295,0)")
		.style("cursor", "hand")
		.on("click", function (d) {
		    if (type == 0) {
		        calendar.svg.selectAll("#bd" + calendar.startDate.getDate())
                .attr("stroke", "#aaaaaa")
		        .attr("stroke-width", 0.25)
		        calendar.startDate.setDate(d.day);
		        calendar.svg.selectAll("#bd" + calendar.startDate.getDate())
                .attr("stroke", "#7f1ac3")
                .attr("stroke-width", 1);
		    }
		    else {
		        calendar.svg.selectAll("#bd" + calendar.endDate.getDate())
                .attr("stroke", "#aaaaaa")
		        .attr("stroke-width", 0.25)
		        calendar.endDate.setDate(d.day);
		        calendar.svg.selectAll("#bd" + calendar.endDate.getDate())
                .attr("stroke", "#7f1ac3")
                .attr("stroke-width", 1);
		    }
		    calendar.updateText();
		})
		.on("mouseover", function (d) {
		    calendar.svg.select("#bd" + d.day).attr("fill", "#B1B1B1");
		})
		.on("mouseout", function (d) {
		    calendar.svg.select("#bd" + d.day).attr("fill", "#dddddd");
		});

        this.svg.selectAll(".daysb").call(function () {
            this.append("rect")
		    .attr("id", function (d) {
		        return "bd" + d.day;
		    })
		    .attr("x", function (d) {
		        return Math.floor(d.day / 17) * 45;
		    })
		    .attr("y", offset)
		    .attr("width", 40)
		    .attr("height", 30)
		    .attr("fill", "#dddddd")
		    .attr("stroke", "#aaaaaa")
		    .attr("stroke-width", 0.25)
            .attr("transform", "scale(0,1)")
            .transition()
            .duration(1000)
            .attr("transform", "scale(1,1)")
            .each("end", function () {
                d3.select(this)
                .transition()
                .duration(1000)
                .attr("y", function (d) {
                    return (d.day - 1)%16 * 35 + offset;
                });
            });

            this.append("text")
		    .attr("x", function (d) {
		        return Math.floor(d.day / 17) * 45 + 10;
		    })
		    .attr("y", offset + 20)
		    .style("font-family", "Segoe UI")
		    .style("font-size", "15px")
		    .style("font-variant", "small-caps")
            .text(function (d) {
                return dayFormat(d.date_obj);
            })
            .attr("transform", "scale(0,1)")
            .transition()
            .duration(1000)
            .attr("transform", "scale(1,1)")
            .each("end", function () {
                d3.select(this)
                .transition()
                .duration(1000)
                .attr("y", function (d) {
                    return (d.day - 1)%16 * 35 + offset + 20;
                });
            });

        });

        this.svg.selectAll("#bd" + modifiedDate.getDate())
        .attr("stroke", "#7f1ac3")
        .attr("stroke-width", 1);


    };

    Calendar.prototype.genYears = function () {
        var years = [];
        var startYear = new Date("2012-01-01");
        var nowYear = new Date(Date.now());

        while (startYear <= nowYear) {
            var tmp = new Date();
            tmp.setFullYear(startYear.getFullYear());
            startYear.setFullYear(startYear.getFullYear() + 1);


            years.push({ date_obj: tmp, year: tmp.getFullYear() });
        }

        return years;
    };

    Calendar.prototype.genMonths = function (year) {
        var months = [];

        for (var i = 0; i < 12; i++) {
            var tmp = new Date();
            tmp.setYear(year);
            tmp.setMonth(i);
            tmp.setDate(1);

            if (tmp < Date.now())
                months.push({ date_obj: tmp, month: tmp.getMonth() });
        }
        return months;
    };

    Calendar.prototype.genDays = function (year, month) {
        var days = [];
        var startDate = new Date();
        startDate.setYear(year);
        startDate.setMonth(month);
        startDate.setDate(1);

        while (startDate.getMonth() == month && startDate <= new Date(Date.now())) {
            var tmp = new Date();
            tmp.setDate(startDate.getDate());
            startDate.setDate(startDate.getDate() + 1);

            days.push({ date_obj: tmp, day: tmp.getDate() });
        }

        return days;
    };

    Calendar.prototype.updateText = function () {
        var calendar = this;

        this.svg.selectAll("#start_text").text(calendar.timeFormat(calendar.startDate));
        this.svg.selectAll("#end_text").text(calendar.timeFormat(calendar.endDate))
        if (d3.selectAll("#submit").empty()) {
            var button_update, update_text;
            var update = this.svg.append("g")
        .attr("id", "submit")
        .style("cursor", "hand")
		.on("click", function () {
		    if (chart) {

		        d3.select("#svg_vis").remove();
		        d3.select("#svg_load").remove();
		        chart.reset();
		        chart.show_loading_screen()
		        chart.load_data(Math.floor(calendar.startDate.getTime() / 1000), Math.floor(calendar.endDate.getTime() / 1000));
		        calendar.svg.selectAll(".yearsb").remove();
		        calendar.svg.selectAll(".monthsb").remove();
		        calendar.svg.selectAll(".daysb").remove();
		        update.remove();
		        cancel.remove();
		    }
		})
		.on("mouseover", function () {
		    button_update.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button_update.attr("fill", "#dddddd");
		});

            button_update = update.append("rect")
		.attr("id", "button_update")
		.attr("x", 10)
		.attr("y", 115)
		.attr("width", 90)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25)
        .attr("transform", "scale(0,1)");
            button_update.transition()
        .duration(1000)
        .attr("transform", "scale(1,1)");

            update_text = update.append("text")
		.attr("id", "update_text")
		.attr("x", 20)
		.attr("y", 135)
		.style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")
		.text("Submit")
        .attr("transform", "scale(0,1)")
        .transition()
        .duration(1000)
        .attr("transform", "scale(1,1)"); ;


            var button_cancel, cancel_text;
            var cancel = this.svg.append("g")
        .style("cursor", "hand")
        .attr("id", "cancel")
		.on("click", function () {
		    calendar.svg.selectAll(".yearsb").remove();
		    calendar.svg.selectAll(".monthsb").remove();
		    calendar.svg.selectAll(".daysb").remove();
		    update.remove();
		    cancel.remove();
		})
		.on("mouseover", function () {
		    button_cancel.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button_cancel.attr("fill", "#dddddd");
		});

            button_cancel = cancel.append("rect")
		.attr("id", "button_cancel")
		.attr("x", 10)
		.attr("y", 150)
		.attr("width", 90)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25)
        .attr("transform", "scale(0,1)");
            button_cancel.transition()
        .duration(1000)
        .attr("transform", "scale(1,1)");

            cancel_text = cancel.append("text")
		.attr("id", "update_text")
		.attr("x", 20)
		.attr("y", 170)
		.style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")
		.text("Cancel")
        .attr("transform", "scale(0,1)")
        .transition()
        .duration(1000)
        .attr("transform", "scale(1,1)");
        }

    };

    return Calendar;
})();




$(function () {
    var cal;
    cal = new Calendar();
});

