var MapView;


MapView = (function () {
    function MapView() {


    };

    MapView.prototype.draw_map = function(){
        var g = d3.select("#map");



        d3.json("data/dk.json", function (error, dk) {

            var subunits = topojson.feature(dk, dk.objects.prov);

            var projection = d3.geo.albers()
                .center([0, 55.4])
                .rotate([4.4, 0])
                .parallels([50, 60])
                .scale(6000)
                .translate([-600, 800]);

            var path = d3.geo.path()
                .projection(projection);

            var subunits = [].concat(topojson.feature(dk, dk.objects.subunits).features, topojson.feature(dk, dk.objects.prov).features);
            g.selectAll(".subunit")
               .data(subunits)
               .enter().append("path")
               .attr("class", function (d) {
                   return "subunit " + d.id;
               })
               .attr("d", path);


            g.append("path")
                .datum(topojson.feature(dk, dk.objects.places))
                .attr("d", path)
                .attr("class", "place");

            g.selectAll(".place-label")
                .data(topojson.feature(dk, dk.objects.places).features)
                .enter().append("text")
                .attr("class", "place-label")
                .attr("transform", function (d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });

            g.selectAll(".place-label")
                .attr("x", function (d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function (d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; });

            g.selectAll(".subunit-label")
                .data(subunits)
                .enter().append("text")
                .attr("class", function (d) { return "subunit-label " + d.id; })
                .attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });
        });
    };


    return MapView;

})();