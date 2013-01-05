var Calendar;

Calendar = (function () {

    function Calendar() {
        this.startDate = (new Date(Date.now())).setMonth((new Date(Date.now())).getMonth() - 1);
        this.endDate = Date.now();
        this.svg = null;

        this.drawCalendar();
    };

    Calendar.prototype.drawCalendar = function () {
        

    };

    return Calendar;
})();




$(function () {
    var cal;
    cal = new Calendar();
});

