var LoadingScreen;

LoadingScreen = (function () {
    function LoadingScreen(x, y) {
        this.x = x;
        this.y = y;
    };

    LoadingScreen.prototype.show_loading_screen = function () {
        var w = 460,
		h = 200,
		x = d3.scale.ordinal().domain(d3.range(3)).rangePoints([0, w], 2);
        var previous = {};
        var ascending = true;
        var fields =
		{ endAngle: 0.0, startAngle: 0.0 };

        var arc = d3.svg.arc()
		.innerRadius(50)
		.outerRadius(90)
		.startAngle(function (d) { return d.startAngle; })
		.endAngle(function (d) { return d.endAngle; });

        var load_screen = d3.select("#vis").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_load");
        var svg = load_screen
		.append("g")
		.attr("transform", "translate(" + this.x + "," + this.y + ")");

        setInterval(function () {
            previous = { endAngle: fields.endAngle, startAngle: fields.startAngle };
            if (fields.endAngle >= 2 * Math.PI) {
                ascending = false;
            }
            if (fields.startAngle >= 2 * Math.PI) {
                fields.startAngle = 0;
                fields.endAngle = 0;
                ascending = true;
            }
            else {
                if (ascending)
                    fields.endAngle += Math.PI / 10;
                else
                    fields.startAngle += Math.PI / 10;

                var path = svg.selectAll("path")
			.data([fields]);

                path.enter().append("path")
			.attr("id", "swizzle")
                //.attr("transform", function(d, i) { return "translate(" + x(i) + ",0)"; })
			.transition()
			.attrTween("d", arcTween);

                path.transition()
			.attrTween("d", arcTween);
            }
        }, 150);

        function arcTween(b) {
            var i = d3.interpolate(previous, b);
            this._current = i(0);
            return function (t) {
                return arc(i(t));
            };
        }
    };

    LoadingScreen.prototype.hide_loading_screen = function () {
        d3.select("#svg_load").remove();
    };


    return LoadingScreen;


})();