// Data utilities
// 遇到NA就設定為undefiend
const parseNAN = string => (string === 'NA' ? undefined : string);
// 日期處理
const parseDate = string => d3.timeParse('%Y-%m-%d')(string)
// 資料型別處裡
// + 轉成數自型別
// d = 一筆電影資料
function type(d) {
    const date = parseDate(d.release_date);
    return {

        budget: +d.budget,
        genre: parseNAN(d.genre),
        // 轉Json格式,.map(function):把每一筆資料丟進function,然後取資料內的name
        genres: JSON.parse(d.genres).map(d => d.name),
        homepage: parseNAN(d.homepage),
        id: +d.id,
        imdb_id: parseNAN(d.imdb_id),
        original_language: parseNAN(d.original_language),
        overview: parseNAN(d.overview),
        popularity: +d.popularity,
        poster_path: parseNAN(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_Year: date.getFullYear(),
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNAN(d.tagline),
        title: parseNAN(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count
    }

}

// 過濾資料
function filterData(data) {
    return data.filter(
        d => {
            return (
                d.release_Year > 1999 && d.release_Year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            )
        }
    )
}


// 折線圖
function prepareLineChartData(data) {
    // 取得年分
    const groupByYear = d => d.release_Year;
    // 取出revenue加總
    const sumOfRevenue = values => d3.sum(values, d => d.revenue);
    // 依年份加總 // 聚合 rollup(data,gropuby後的聚合方式(函數),用什麼grop)
    const sumOfRevenueByYear = d3.rollup(data, sumOfRevenue, groupByYear);
    // 取出budget加總
    const sumOfBudget = values => d3.sum(values, d => d.budget);
    // 依年分budget加總
    const sumOfBudgetByYear = d3.rollup(data, sumOfBudget, groupByYear);
    // 放入Array排序 !!不排序線不會連續呈現
    const revenueArray = Array.from(sumOfRevenueByYear).sort((a, b) => a[0] - b[0]);
    const budgetArray = Array.from(sumOfBudgetByYear).sort((a, b) => a[0] - b[0]);
    // 年份字串轉日期格式(x軸用)
    const parseYear = d3.timeParse('%Y');
    const dates = revenueArray.map(d => parseYear(d[0]));
    console.log(revenueArray)
    // 找最大值(先把revenue 跟budget串起來再比較)
    const revenueAndBudgetArray = revenueArray.map(d => d[1]).concat(budgetArray.map(d => d[1]));
    const yMax = d3.max(revenueAndBudgetArray);
    //console.log(budgetArray)
    //console.log(revenueAndBudgetArray)
    //console.log(yMax)

    // 最終資料回傳
    const lineData = {
        series: [
            {
                name: 'Revenue',
                color: 'dodgerblue',
                values: revenueArray.map(d => ({ date: parseYear(d[0]), value: d[1] }))
            },
            {
                name:'Budget',
                color:'darkorange',
                values:budgetArray.map(d => ({date:parseYear(d[0]),value:d[1]}))
            }
        ],
        dates:dates,
        yMax:yMax
    }
    //console.log(lineData)
    return lineData;
}

// SVG畫圖
function setupCanvas(lineChartData) {
    // 算圖的空間
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = { top: 80, right: 60, bottom: 40, left: 80 };
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);

    // 在(d3.select)div設定(.append())svg + <g>:group
    const this_svg = d3.select('.liner-chart-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height).append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);

    // X軸處裡 -> 時間
    //方法1: v1
    // d3.extent 找max,min供畫圖用
    const xExtent = d3.extent(lineChartData.dates);
    const xScale = d3.scaleTime().domain(xExtent).range([0, chart_width]);
    // scaleLinear():呈現形式
    // .domain():資料的min~max
    // .range():實際要放的東西的地方
    //debugger
    

    // Y軸處裡
    // 垂直空間分配-平均分布給各種類
    const yScale = d3.scaleLinear().domain([0,lineChartData.yMax]).range([chart_height,0]);
    // 營收最小放下方, 與座標相反
    
    
    // liner generator
    const lineGen=d3.line()
    .x(d =>xScale(d.date))
    .y(d =>yScale(d.value));
    
    // Draw Line
    const chartGroup = this_svg.append('g').attr('class','line-chart');
    
    // 出現/更新/消失
    // 產生點 .enter:讓突出現
    chartGroup.selectAll(".line-series").data(lineChartData.series).enter()
    .append('path')
    .attr('class',d =>`line=series${d.name.toLowerCase()}`)
    .attr('d',d =>lineGen(d.values))
    .style('fill','none').style('stroke',d => d.color);
    
    // Draw X axis
    const xAxis=d3.axisBottom(xScale).tickSizeOuter(0);
    this_svg.append('g').attr('class','x axis')
    .attr('transform',`translate(0,${chart_height})`)
    .call(xAxis)
    
    // Draw Y axis
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTicks)
    .tickSizeInner(-chart_width).tickSizeOuter(0);
    
    this_svg.append('g').attr('class','y axis').call(yAxis);

    // Draw Series Label
     // 放在最後一個點的旁邊(x+5,y不變)
     chartGroup.append('g').attr('class','series-labels')
               .selectAll('.series-label').data(lineChartData.series).enter()
               .append('text')
               .attr('x',d => xScale(d.values[d.values.length-1].date)+5)
               .attr('y',d => yScale(d.values[d.values.length-1].value))
               .text(d =>d.name)
               .style('dominant-baseline','central')
               .style('font-size','0.7em')
               .style('font-weight','bold')
               .style('fill',d =>d.color);
               
    
    // 表頭
    const header = this_svg.append('g').attr('class', 'bar-header')
        .attr('transform', `translate(0,${-chart_margin.top / 2})`)
        .append('text');
    header.append('tspan').text('Budget VS. Revenue in $US');
    header.append('tspan').text('Top 100 films by budget,2000-2009')
    .attr('x', 0).attr('y', 20).style('font-size', '0.8em').style('fill', '#555');
    
    
    // // 顯示刻度轉換 d3.format('~s')(1500) => 1.5K
    function formatTicks(d) {
        return d3.format('~s')(d)
            .replace('M', 'mil')
            .replace('G', 'bil')
            .replace('T', 'tri')
        }
    
}


// Main 主執行區
function ready(movies) {
    const moviesClean = filterData(movies);
    const lineChartData = prepareLineChartData(moviesClean);
    //console.log(lineChartData);
    setupCanvas(lineChartData);
}

// 載入資料 type:callback func. => 把資料丟進type(data)
d3.csv('./data/movies.csv', type).then(
    res => {
        ready(res);
        // console.log(res);
    }
);



