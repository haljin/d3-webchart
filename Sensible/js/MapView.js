var MapView;


MapView = (function () {
    function MapView() {

        this.vis = null;
        this.g = null;
        this.gleg = null;
        this.gsh = null;

        this.projection = d3.geo.albers()
                .center([0, 55.4])
                .rotate([12, 0])
                .scale(35000)
                .translate([-8500, 2000]);
        this.path = d3.geo.path()
                .projection(this.projection);
        this.subunits = null;;
    };

    MapView.prototype.draw_map = function(token){
        vis = d3.select("#map").attr("clip-path", "url(#clipMap)"); 
        var map = this;
        d3.select(vis.node().parentNode).append("clipPath").attr("id", "clipMap").append("rect").attr("x", 0).attr("y", 400).attr("width", 400).attr("height", 400);

        g = vis.append("g").attr("id", "mapDisplay");
        gsh = g.append("g").attr("id", "mapShapes");
        gleg = g.append("g").attr("id", "mapLegend");

        
       
        //d3.json("data/loc_contact/" + token, map.draw_points);       

        d3.json("data/dk.json", function (error, dk) {

            map.subunits = [].concat(topojson.feature(dk, dk.objects.subunits).features, topojson.feature(dk, dk.objects.prov).features);

            gsh.append("rect").attr("x", 0).attr("y", 400).attr("width", 400).attr("height", 400).style("fill", "#ffffff");
            
            gsh.selectAll(".subunit")
               .data(map.subunits)
               .enter().append("path")
               .attr("class", function (d) {
                   return "subunit " + d.id;
               })
               .attr("d", map.path);


            gleg.append("path")
                .datum(topojson.feature(dk, dk.objects.places))
                .attr("d", map.path)
                .attr("class", "place");

            

            gleg.selectAll(".place-label")
                .data(topojson.feature(dk, dk.objects.places).features)
                .enter().append("text")
                .attr("class", "place-label")
                .attr("transform", function (d) {
                    return "translate(" + map.projection(d.geometry.coordinates) + ")";
                })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });

            gleg.selectAll(".place-label")
                .attr("x", function (d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function (d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; });

            gleg.selectAll(".subunit-label")
                .data(map.subunits)
                .enter().append("text")
                .attr("class", function (d) { return "subunit-label " + d.id; })
                .attr("transform", function (d) { return "translate(" + map.path.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });


          
        });

        var zoom = d3.behavior.zoom()
           .on("zoom", function () {
               //g.attr("transform", "translate(" +
               //    d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
               map.projection.scale(35000)
                       .translate([-8500 + d3.event.translate[0], 2000 + d3.event.translate[1]]);

               g.selectAll("path")
                   .attr("d", map.path.projection(map.projection));

               gleg.selectAll(".place-label").attr("transform", function (d) { return "translate(" + map.projection(d.geometry.coordinates) + ")"; })
               gleg.selectAll(".subunit-label")
                .attr("transform", function (d) { return "translate(" + map.path.centroid(d) + ")"; })

               map.update_points();
               
           });
        vis.call(zoom)
    };

    MapView.prototype.draw_points = function (error, data) {
        gleg.selectAll("circle").data(data.data).enter().append("circle").attr("r", 5)
            .attr("cx", function (d) {
                return map.projection([d.lon, d.lat])[0];
            })
            .attr("cy", function (d) {
                return map.projection([d.lon, d.lat])[1];
            })
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
        return d3.select("#map").remove();
    };


    return MapView;

})();