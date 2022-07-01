// Data utilities
// 遇到NA就設定為undefiend
const parseNA = string => (string ==='NA' ? undefined : string);
// 日期處理
const parseDate =string => d3.timeParse('%Y-%m-%d')(string)
// + 轉成數自型別
// d = 一筆電影資料
function type(d) {
    const date =parseDate(d.release_date);
    return{
        
        budget: +d.budget,
        genre: parseNA(d.genre),
        // 轉Json格式,.map(function):把每一筆資料丟進function,然後取資料內的name
        genres:JSON.parse(d.genres).map(d=>d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id:parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity:+d.popularity,
        poster_path:parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date:date,
        release_Year:date.getFullYear(),
        revenue:+d.revenue,
        runtime:+d.runtime,
        tagline:parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count
    }
    
}

// 過濾資料
function filterData(data) {
    return data.filter(
        d =>{
            return(
                d.release_Year > 1999 && d.release_Year <2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            )
        }
    )
}

// 聚合 rollup(datd,gropuby後的聚合方式(函數),用什麼grop)
function prepareBarCharData(data) {
    console.log(data);
    const dataMap = d3.rollup(
        // step 1(總資料)
        data,
        // step 3(分群後,各群處裡)
        v =>d3.sum(v,leaf => leaf.revenue), // revenue 加總 v= 經過d分群過後的東西, leaf=要sum的部分 *sum(values, valueof)
        // step 2(分類)
        d => d.genre //  依電影分類(gropby) 
        );
    const dataArray =Array.from(dataMap,d =>({genre:d[0],revenue:d[1]}));
    //  Array.from回傳一個arrayd  =array[0]
    //console.log(dataMap);
    //console.log(dataArray);
    return dataArray;    
}

// 降糸 取預算前100的data
function prepareScatterData(data) {
    return data.sort((a,b)=>b.budget-a.bugget)
    .filter((d,i) => i<100);
    
}

// SVG畫圖
function setupCanvas(scatterData) {
    // 算圖的空間
    const svg_width= 500;
    const svg_height=500;
    const chart_margin={top:80,right:40,bottom:40,left:80};
    const chart_width=svg_width-(chart_margin.left+chart_margin.right);
    const chart_height=svg_height-(chart_margin.top+chart_margin.bottom);

    // 在(d3.select)div設定(.append())svg + <g>:group
    const this_svg= d3.select('.scatter-plot-container').append('svg') 
    .attr('width',svg_width).attr('height',svg_height).append('g')
    .attr('transform',`translate(${chart_margin.left},${chart_margin.top})`);
    
    // X軸處裡
    //方法1: v1
    // d3.extent 找max,min供畫圖用
    const xExtent=d3.extent(scatterData,d=>d.budget);
    const xScale_v1=d3.scaleLinear().domain(xExtent).range([0,chart_width]);
    // scaleLinear():呈現形式
    // .domain():資料的min~max
    // .range():實際要放的東西的地方

    const xMax= d3.max(scatterData,d=>d.revenue);
    // 方法2 v2: 0 -> max
    const xScale_v2=d3.scaleLinear().domain([0,xMax]).range([0,chart_width]);

    //簡化寫法 v3: Sort writing for v2(簡化版)
    const xScale_v3 = d3.scaleLinear([0,xMax],[0,chart_width]);

    // Y軸處裡
    // 垂直空間分配-平均分布給各種類
    const yExtent=d3.extent(scatterData,d=>d.revenue);
    // 營收最小放下方
    const yScale_v1=d3.scaleLinear().domain(yExtent).range([chart_height,0]);
    // data.map(function),把data進function
    // const yScale = d3.scaleBand().domain(barChartData.map(d => d.genre))
    //                 .rangeRound([0,chart_height])
    //                 .paddingInner(0.25); // bar的間距,同時會縮減bar的高度
                    

    // 產生點 .enter:讓突出現
    // xScale, yScale =>轉換器
    this_svg.selectAll('.scatter')
            .data(scatterData)
            .enter()
            .append('circle')
            .attr('class','scatter')
            .attr('cx',d => xScale_v1(d.budget))
            .attr('cy',d => yScale_v1(d.revenue))
            .attr('r',3)
            .style('fill','dodgerblue')
            .style('fill-opacticy',0.5);
                 

    // 表頭
    const header=this_svg.append('g').attr('class','bar-header')
                 .attr('transform',`translate(0,${-chart_margin.top/2})`)
                 .append('text');
    header.append('tspan').text('Budget VS. Revenue in $US');
    header.append('tspan').text('Top 100 films by budget,2000-2009')
          .attr('x',0).attr('y',20).style('font-size','0.8em').style('fill','#555');

    
    // 顯示刻度轉換 d3.format('~s')(1500) => 1.5K
    function foramtTicks(d) {
        return d3.format('~s')(d)
        .replace('M','mil')
        .replace('G','bil')
        .replace('T','tri')
    
        
        
    }
    


    // 刻度與軸線-X
    const xAxis = d3.axisBottom(xScale_v1)
                 .ticks(5)
                 .tickFormat(foramtTicks)
                 .tickSizeInner(-chart_height)
                 .tickSizeOuter(0);
    
    const xAxisDraw =this_svg.append('g')
                     .attr('class','x axis')
                     .attr('transform',`translate(-10,${chart_height+10})`)
                     .call(xAxis)
                     .call(addLable,'Budget',25,0);
    
    // 拉開字與距離
    xAxisDraw.selectAll('text').attr('dy','2em');

    // 刻度與軸線-Y
    const yAxis =d3.axisLeft(yScale_v1)
                    .ticks(5)
                    .tickFormat(foramtTicks)
                    .tickSizeInner(-chart_height)
                    .tickSizeOuter(0);

    const yAxisDraw =this_svg.append('g')
                     .attr('class','y axis')
                     .attr('transform',`translate(-10,10)`)
                     .call(yAxis)
                     .call(addLable,'Revenue',-30,-30);
    
     // 拉開字與距離
    yAxisDraw.selectAll('text').attr('dx','-2em');
    
    
}
function addLable(axis,label,x,y) {
/* axis 是呼叫者 - 哪一軸 */
axis.selectAll('.tick:last-of-type tex')
    .clone()
    .text(label)
    .attr('x',x)
    .attr('y',y)
    .style('text-anchor','start')
    .style('font-weight','bold')        
    .style('fill','#555');        

}


// Main 主執行區
function ready(movies) {
    const moviesClean=filterData(movies);
    const scatterData = prepareScatterData(moviesClean);   
    console.log(scatterData);
    setupCanvas(scatterData);
}

// type:callback func. => 把資料丟進type(data)
d3.csv('./data/movies.csv',type).then(
    res =>{
        ready(res);
        // console.log(res);
    }
);



