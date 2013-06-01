var MapView;


MapView = (function () {
    function MapView(subject) {

        this.vis = null;
        this.g = null;
        this.gleg = null;
        this.gsh = null;
        this.points = null;
        this.accuracy = 0.02;
        this.subject = subject;
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.data = null;
        this.projection = d3.geo.albers()
                .center([0, 55.4])
                .rotate([12, 0])
                .scale(35000)
                .translate([-8500, 2000]);
        this.path = d3.geo.path()
                .projection(this.projection);
        this.subunits = null;;
    };

    MapView.prototype.draw_map = function(token, start, end){
        vis = d3.select("#map").attr("clip-path", "url(#clipMap)"); 
        var map = this;
        d3.select(vis.node().parentNode).append("clipPath").attr("id", "clipMap").append("rect").attr("x", 0).attr("y", 400).attr("width", 400).attr("height", 400);

        this.g = vis.append("g").attr("id", "mapDisplay");
        this.gsh = this.g.append("g").attr("id", "mapShapes");
        this.gleg = this.g.append("g").attr("id", "mapLegend");

        
       

        setTimeout(function () {
            d3.json("data/loc_contact/" + token, function (err, data) {
                map.data = data;
                map.draw_points(start, end)
            });
        }, 2500);

        d3.json("data/dk.json", function (error, dk) {

            map.subunits = [].concat(topojson.feature(dk, dk.objects.subunits).features, topojson.feature(dk, dk.objects.prov).features);
            map.gsh.append("rect").attr("x", -10000).attr("y", -10000).attr("width", 20000).attr("height", 20000).style("fill", "#ffffff");

            
            map.gsh.selectAll(".subunit")
               .data(map.subunits)
               .enter().append("path")
               .attr("class", function (d) {
                   return "subunit " + d.id;
               })
               .attr("d", map.path);


            map.gleg.append("path")
                .datum(topojson.feature(dk, dk.objects.places))
                .attr("d", map.path)
                .attr("class", "place");

            

            map.gleg.selectAll(".place-label")
                .data(topojson.feature(dk, dk.objects.places).features)
                .enter().append("text")
                .attr("class", "place-label")
                .attr("transform", function (d) {
                    return "translate(" + map.projection(d.geometry.coordinates) + ")";
                })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });

            map.gleg.selectAll(".place-label")
                .attr("x", function (d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function (d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; });

            map.gleg.selectAll(".subunit-label")
                .data(map.subunits)
                .enter().append("text")
                .attr("class", function (d) { return "subunit-label " + d.id; })
                .attr("transform", function (d) { return "translate(" + map.path.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });

            map.g.append("text")
                .attr("id", "maploading")
                .attr("x", 200)
                .attr("y", 600)
                .style("font-family", "Segoe UI")
                .style("font-variant", "small-caps")
                .style("font-size", "24px")
                .text("Loading...");
          
        });

        var zoom = d3.behavior.zoom()
           .on("zoom", function () {
               this.g.attr("transform", "translate(" +
                   d3.event.translate.join(",") + ")");
               //map.projection.translate([-8500 + d3.event.translate[0], 2000 + d3.event.translate[1]]);

               map.g.selectAll("path")
                   .attr("d", map.path.projection(map.projection));

               map.gleg.selectAll(".place-label").attr("transform", function (d) { return "translate(" + map.projection(d.geometry.coordinates) + ")"; })
               map.gleg.selectAll(".subunit-label")
                .attr("transform", function (d) { return "translate(" + map.path.centroid(d) + ")"; })

               map.update_points();
               
           });
        vis.call(zoom)
    };

    MapView.prototype.draw_points = function (start, end) {
        var map = this;
        if (map.data != null) {
            this.points = DataProcessor.parse_loc_data(map.data.data, this.accuracy, map.subject.name, start, end);
            var range = [d3.min(this.points, function (d) { return d.count; }),
                d3.max(this.points, function (d) { return d.count; })];
            var colorScale = d3.scale.linear().range([0.5, 0.9]).domain(range);
            var sizeScale = d3.scale.linear().range([6, 9]).domain(range);

            d3.select("#maploading").remove();
            map.gleg.selectAll("circle").data(this.points).enter().append("circle")
                .attr("r", function (d) {
                    return sizeScale(d.count);
                })
                .attr("cx", function (d) {
                    return map.projection([d.lon, d.lat])[0];
                })
                .attr("cy", function (d) {
                    return map.projection([d.lon, d.lat])[1];
                })
                .style("fill", function (d) {
                    return map.colors[d.type];
                })
                .style("opacity", function (d) {
                    return colorScale(d.count);
                });
        }
    };

    MapView.prototype.undraw_points = function () {
        var map = this;
        map.gleg.selectAll("circle").remove();
    };

    MapView.prototype.update_points =function () {
        gleg.selectAll("circle")
                    .attr("cx", function (d) {
                        return map.projection([d.lon, d.lat])[0];
                    })
                    .attr("cy", function (d) {
                        return map.projection([d.lon, d.lat])[1];
                    })
    };

    

    MapView.prototype.undraw_map = function () {
        d3.select("#clipMap").remove();
        return d3.select("#map").remove();
    };


    return MapView;

})();