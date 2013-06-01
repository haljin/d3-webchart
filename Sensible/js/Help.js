var Help;

Help = (function () {

    Help = function () {

    };

    Help.draw_help = function () {
        //Draw the unzoom button
        var button,
            button_text,
            help = false;
        var group = d3.select("#Details").append("g").attr("id","help");

        //timeline
        group.append("marker")
.attr("id", "arrow")
.attr("viewBox", "0 0 10 10")
.attr("refX", 0)
.attr("refY", 5)
.attr("markerUnits", "strokeWidth")
.attr("markerWidth", 8)
.attr("markerHeight", 6)
.attr("orient", "auto")
.append("path")
.attr("d", "M 0 0 L 10 5 L 0 10 z");

        group.append("line")
          .attr("x1", 5)
          .attr("x2", 50)
          .attr("y1", 5)
          .attr("y2", 50)
          .style("stroke", "black")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(\#arrow)").attr("transform", "translate(170,690)");


        group.append("marker")
.attr("id", "arrow")
.attr("viewBox", "0 0 10 10")
.attr("refX", 0)
.attr("refY", 5)
.attr("markerUnits", "strokeWidth")
.attr("markerWidth", 8)
.attr("markerHeight", 6)
.attr("orient", "auto")
.append("path")
.attr("d", "M 0 0 L 10 5 L 0 10 z");

        group.append("line")
          .attr("x1", -5)
          .attr("x2", -220)
          .attr("y1", -5)
          .attr("y2", -10)
          .style("stroke", "black")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(\#arrow)")
            .attr("transform", "translate(1000,320)");





        group.append("marker")
.attr("id", "arrow")
.attr("viewBox", "0 0 10 10")
.attr("refX", 0)
.attr("refY", 5)
.attr("markerUnits", "strokeWidth")
.attr("markerWidth", 8)
.attr("markerHeight", 6)
.attr("orient", "auto")
.append("path")
.attr("d", "M 0 0 L 10 5 L 0 10 z");

        group.append("line")
          .attr("x1", -5)
          .attr("x2", -170)
          .attr("y1", -5)
          .attr("y2", 5)
          .style("stroke", "black")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(\#arrow)")
            .attr("transform", "translate(1020,450)");


        group.append("text")
.attr("x", 30)
.attr("y", 690)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("Adjust timeline by dragging edges or drawing the field!");


        //bubble

        group.append("text")
.attr("x", 30)
.attr("y", 120)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("Click on any bubble for details!");


        group.append("text")
.attr("x", 980)
.attr("y", 140)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("The closer to middle ");

        group.append("text")
.attr("x", 1020)
.attr("y", 160)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text(" the better");

        group.append("text")
.attr("x", 1000)
.attr("y", 180)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("friends you are");


        group.append("text")
.attr("x", 1040)
.attr("y", 320)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("First ring ");

        group.append("text")
.attr("x", 980)
.attr("y", 340)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text(" are your close friends");

        group.selectAll(".innerweb").data([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]).enter().append("rect")
           .attr("x", 702)
           .attr("y", 360)
           .attr("width", 113)
           .attr("height", 30)
            .attr("transform", function(d)
            { 
                return "rotate(" + (-22.5 * d) + " " + 600+ " " + 375 + ")";
            })
           .attr("fill", "rgb(6,120,155)")
           .attr("class","innerweb")
           .style("opacity", 0.2);
           

        group.selectAll(".outerweb").data([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).enter().append("rect")
           .attr("x", 812)
           .attr("y", 360)
           .attr("width", 115)
           .attr("height", 30)
            .attr("transform", function (d) {
                return "rotate(" + (-22.5 * d) + " " + 600 + " " + 375 + ")";
            })
           .attr("fill", "rgb(60,12,155)")
             .attr("class", "outerweb")
           .style("opacity", 0.2);




        group.append("text")
.attr("x", 1030)
.attr("y", 450)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("Second ring ");


        group.append("text")
.attr("x", 980)
.attr("y", 470)
.style("font-family", "Segoe UI")
.style("font-size", "20px")
.style("font-variant", "small-caps")
.text("are your school friends");
    };

    Help.undraw_help = function () {
        return d3.select("#Details").select("#help").remove();
    };
    return Help;

})();