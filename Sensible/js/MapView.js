var MapView;


MapView = (function () {
    function MapView() {


    };

    MapView.prototype.draw_map = function(){
        var vis = d3.select("#map").attr("clip-path", "url(#clipMap)");     
        d3.select(vis.node().parentNode).append("clipPath").attr("id", "clipMap").append("rect").attr("x", 100).attr("y", 400).attr("width", 400).attr("height", 400);

        var g = vis.append("g").attr("id", "mapDisplay");
        var gsh = g.append("g").attr("id", "mapShapes");
        var gleg = g.append("g").attr("id", "mapLegend");
        var projection, path, subunits;
       


        d3.json("data/dk.json", function (error, dk) {

            projection = d3.geo.albers()
                .center([0, 55.4])
                .rotate([12, 0])
                .scale(35000)
                .translate([-8500, 2000]);

            path = d3.geo.path()
                .projection(projection);

            subunits = [].concat(topojson.feature(dk, dk.objects.subunits).features, topojson.feature(dk, dk.objects.prov).features);

            gsh.append("rect").attr("x", 100).attr("y", 400).attr("width", 400).attr("height", 400).style("fill", "#ffffff");
            
            gsh.selectAll(".subunit")
               .data(subunits)
               .enter().append("path")
               .attr("class", function (d) {
                   return "subunit " + d.id;
               })
               .attr("d", path);


            gleg.append("path")
                .datum(topojson.feature(dk, dk.objects.places))
                .attr("d", path)
                .attr("class", "place");

            

            gleg.selectAll(".place-label")
                .data(topojson.feature(dk, dk.objects.places).features)
                .enter().append("text")
                .attr("class", "place-label")
                .attr("transform", function (d) {
                    return "translate(" + projection(d.geometry.coordinates) + ")";
                })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });

            gleg.selectAll(".place-label")
                .attr("x", function (d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function (d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; });

            gleg.selectAll(".subunit-label")
                .data(subunits)
                .enter().append("text")
                .attr("class", function (d) { return "subunit-label " + d.id; })
                .attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .text(function (d) { return d.properties.name; });


          
        });

        var zoom = d3.behavior.zoom()
           .on("zoom", function () {
               //g.attr("transform", "translate(" +
               //    d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
               projection.scale(35000 * d3.event.scale)
                       .translate([-8500 + d3.event.translate[0], 2000 + d3.event.translate[1]]);

               g.selectAll("path")
                   .attr("d", path.projection(projection));

               gleg.selectAll(".place-label").attr("transform", function (d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
               gleg.selectAll(".subunit-label")
                .attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })


               
           });
        vis.call(zoom)
    };

    MapView.prototype.undraw_map = function () {
        return d3.select("#map").remove();
    }


    return MapView;

})();