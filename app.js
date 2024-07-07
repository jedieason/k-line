var margin = {top: 20, right: 50, bottom: 30, left: 60},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// 設定時間格式
var parseDate = d3.timeParse("%Y%m%d");

// K線圖的x
var x = techan.scale.financetime()
    .range([0, width]);
var crosshairY = d3.scaleLinear()
    .range([height, 0]);
// K線圖的y
var y = d3.scaleLinear()
    .range([height - 60, 0]);
// 成交量的y
var yVolume = d3.scaleLinear()
    .range([height , height - 60]);
//成交量的x
var xScale = d3.scaleBand().range([0, width]).padding(0.15);

var sma0 = techan.plot.sma()
    .xScale(x)
    .yScale(y);

var sma1 = techan.plot.sma()
    .xScale(x)
    .yScale(y);
var ema2 = techan.plot.ema()
    .xScale(x)
    .yScale(y);
var candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y);

var zoom = d3.zoom()
    .scaleExtent([1, 5])
    .translateExtent([[0, 0], [width, height]])
    .extent([[margin.left, margin.top], [width, height]])
    .on("zoom", zoomed);

var zoomableInit, yInit;
var xAxis = d3.axisBottom()
    .scale(x);

var yAxis = d3.axisLeft()
    .scale(y);

var volumeAxis = d3.axisLeft(yVolume)
    .ticks(4)
    .tickFormat(d3.format(",.3s"));
var ohlcAnnotation = techan.plot.axisannotation()
    .axis(yAxis)
    .orient('left')
    .format(d3.format(',.2f'));
var timeAnnotation = techan.plot.axisannotation()
    .axis(xAxis)
    .orient('bottom')
    .format(d3.timeFormat('%Y-%m-%d'))
    .translate([0, height]);

// 設定十字線
var crosshair = techan.plot.crosshair()
    .xScale(x)
    .yScale(crosshairY)
    .xAnnotation(timeAnnotation)
    .yAnnotation(ohlcAnnotation)
    .on("move", move);

// 設定文字區域
var textSvg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + margin.top + ")");
//設定顯示文字，web版滑鼠拖曳就會顯示，App上則是要點擊才會顯示
var svgText = textSvg.append("g")
        .attr("class", "description")
        .append("text")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "start")
        .text("");
//設定畫圖區域
var svg = d3.select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("pointer-events", "all")
    .append("g")
    .attr("transform", "translate(" + margin.left + margin.top + ")");

var dataArr;

function autoLoadData() {
    fetch('https://script.google.com/macros/s/AKfycbyQS1XpABYn4TMpNKbwnNccCQoSztjvgA4ImVq3ATZJeSNfSqGPX4ditzVeOc81kOo/exec')
        .then(response => response.json())
        .then(data => {
            svg.selectAll("*").remove(); // 切換不同資料需要重新畫圖，因此需要先清除原先的圖案
            var accessor = candlestick.accessor();
            data = data.Data.map(function(d) { // 設定data的格式
                return {
                    date: parseDate(d.date),
                    open: +d.open,
                    high: +d.high,
                    low: +d.low,
                    close: +d.close,
                    volume: +d.volume
                };
            }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

            var newData = data.map(function(d) {
                return {
                    date: parseDate(d.date),
                    volume: d.volume
                };
            }).reverse();

            svg.append("g")
                .attr("class", "candlestick");
            svg.append("g")
                .attr("class", "sma ma-0");
            svg.append("g")
                .attr("class", "sma ma-1");
            svg.append("g")
                .attr("class", "ema ma-2");
            svg.append("g")
                .attr("class", "volume axis");
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")");

            svg.append("g")
                .attr("class", "y axis")
                .append("text")
                .attr("y", -10)
                .style("text-anchor", "end")
                .text("Price (TWD)");

            // Data to display initially
            draw(data.slice(0, data.length), newData);
        });
}

function draw(data, volumeData) {
    // 設定domain，決定各座標所用到的資料
    x.domain(data.map(candlestick.accessor().d));
    y.domain(techan.scale.plot.ohlc(data, candlestick.accessor()).domain());
    xScale.domain(volumeData.map(function(d){return d.date;}))
    yVolume.domain(techan.scale.plot.volume(data).domain());

    // Add a clipPath: everything out of this area won't be drawn.
    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width )
        .attr("height", height )
        .attr("x", 0)
        .attr("y", 0);

    //在各位置放入適當的資料
    svg.select("g.candlestick").datum(data).call(candlestick);
    svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(5)(data)).call(sma0);
    svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(data)).call(sma1);
    svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(60)(data)).call(ema2);
    svg.select("g.volume.axis").datum(volumeData).call(d3.axisLeft(yVolume).ticks(3).tickFormat(d3.format(",.3s")));
    svg.select("g.x.axis").call(xAxis);
    svg.select("g.y.axis").call(yAxis);
    svg.append("g")
        .attr("class", "crosshair")
        .attr("clip-path", "url(#clip)")
        .datum({ x: x.domain()[80], y: data[80] })
        .call(crosshair);
}

function zoomed() {
    var t = d3.event.transform;
    x.zoomable().domain(t.rescaleX(zoomableInit).domain());
    svg.select("g.candlestick").call(candlestick);
    svg.select("g.sma.ma-0").call(sma0);
    svg.select("g.sma.ma-1").call(sma1);
    svg.select("g.ema.ma-2").call(ema2);
    svg.select("g.x.axis").call(xAxis);
    svg.select("g.y.axis").call(yAxis);
}

function move(coords) {
    svgText.text(
        "目前價格：" + coords.y.toFixed(2)
    );
}

// 自動加載資料，每 10 秒更新一次
setInterval(autoLoadData, 10000);
