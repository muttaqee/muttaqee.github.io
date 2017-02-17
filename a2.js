var isPlaying; // game state (isPlaying == game is repetitively stepping)
var intervalID; // for controlling setInterval() (for continuously advancing automaton)
var cells; // boolean 2-d array (represents rows of cells; alive == 1, dead/uninitiated == 0)
var temp_cells;
var size; // grid size (of displayed portion of grid; actual size is size + 2r)
var step_interval; // step time interval, in milliseconds

var r; // radius (of cells' "neighborhoods")
var l; // loneliness threshold
var o; // overpopulation threshold
var g_min; // generation minimum
var g_max; // generation maximum

var gridFillType = { clear:0, random:1 }; // Grid configurations (may add more; handling required for each type)

var toroidal; // TODO

$(document).ready(function() {
    // initialize variables and DOM sliders
    initialize();
    
    // Make initial array; draw initial grid
    $('#grid table').load(setGrid(gridFillType.random));
    
    // cell responsivenesss
    $(document).on('mouseenter', 'td', function() {
        $(this).fadeTo(250, 0.5);
    });
    $(document).on('mouseleave', 'td', function() {
        $(this).fadeTo(250, 1);
    });
    
    // start button handling
    $(document).on('click', '#start', function () {
        if (!isPlaying) {
            isPlaying = true;
            play();
        }
    });
    
    // stop button handling
    $(document).on('click', '#stop', function() {
        stop();
    });
    
    // step button handling
    $(document).on('click', '#step', function() {
        if (!isPlaying) {
            step();
        }
    });
    
    // randomize button handling
    $(document).on('click', '#randomize', function() {
        setGrid(gridFillType.random);
    });
    
    // reset button handling
    $(document).on('click', '#reset', function() {
        setGrid(gridFillType.clear);
    });
    
    // randomize dansity slider handling
    $(document).on('change', '#randomize_density', function() {
        $('label #randomize_density_display').text(parseInt($('#randomize_density').val(), 10) / 100);
    });
    
    // grid size slider handling
    $(document).on('change', '#grid_size', function() {
        $('label #grid_size_display').text(parseInt($('#grid_size').val(), 10));
    });
    
    // step interval slider handling
    $(document).on('change', '#step_speed', function() {
        var val = $('#step_speed').val();
        $('label #step_interval_display').text(val);
        setStepInterval(val);
    });
    
    // cell-click handling
    $(document).on('click', 'td', function() {
        // get coordinates
        var str = $(this).attr('id');
        var x = str.substring(0, str.indexOf('-'));
        var y = str.substring(str.indexOf('-') + 1, str.length);
        toggleCell(x, y);
    });
    
    // r-slider handling
    $(document).on('change', '#r', function() {
        var val = $(this).val();
        $('label #r_display').text(val);
        r = parseInt(val, 10);
    });
    
    // l-slider handling
    $(document).on('change', '#l', function() {
        var val = $(this).val();
        $('label #l_display').text(val);
        l = parseInt(val, 10);
        if (l > o) {
            var $o = $('#o').clone().attr('value', l);
            $('#o').replaceWith($o);
            $('label #o_display').text(l);
            o = l;
        }
    });
    
    // o-slider handling
    $(document).on('change', '#o', function() {
        var val = $(this).val();
        $('label #o_display').text(val);
        o = parseInt(val, 10);
        if (o < l) {
            var $l = $('#l').clone().attr('value', o);
            $('#l').replaceWith($l);
            $('label #l_display').text(o);
            l = o;
        }
    });
    
    // g_min-slider handling
    $(document).on('change', '#g_min', function() {
        var val = $(this).val();
        $('label #g_min_display').text(val);
        g_min = parseInt(val, 10);
        if (g_min > g_max) {
            var $g_max = $('#g_max').clone().attr('value', g_min);
            $('#g_max').replaceWith($g_max);
            $('label #g_max_display').text(g_min);
            g_max = g_min;
        }
    });
    
    // g_max-slider handling
    $(document).on('change', '#g_max', function() {
        var val = $(this).val();
        $('label #g_max_display').text(val);
        g_max = parseInt(val, 10);
        if (g_max < g_min) {
            var $g_min = $('#g_min').clone().attr('value', g_max);
            $('#g_min').replaceWith($g_min);
            $('label #g_min_display').text(g_max);
            g_min = g_max;
        }
    });
    
});

var initialize = function() {
    isPlaying = false;
    size = 20;
    step_interval = 500;
    r = 1;
    l = 2;
    o = 3;
    g_min = 3;
    g_max = 3;
    
    var r_min = 1;
    var r_max = 10;
    var l_min = 0;
    var o_min = 0;
    var g_min_min = 0;
    var g_max_min = 0;
    var param_max = 4 * r * (r + 1) - 1;
    
    toroidal = false;
    
    $('input[id="r"]').attr('min', r_min);
    $('input[id="r"]').attr('max', r_max);
    $('input[id="r"]').attr('value', r);
    
    
    $('#l').attr('min', l_min);
    $('#l').attr('max', param_max);
    $('#l').attr('value', l);
    
    $('input[id="o"]').attr('min', o_min);
    $('input[id="o"]').attr('max', param_max);
    $('input[id="o"]').attr('value', o);
    
    $('input[id="g_min"]').attr('min', g_min_min);
    $('input[id="g_min"]').attr('max', param_max);
    $('input[id="g_min"]').attr('value', g_min);
    
    $('input[id="g_max"]').attr('min', g_max_min);
    $('input[id="g_max"]').attr('max', param_max);
    $('input[id="g_max"]').attr('value', g_max);
    
    // hide stop button, initially
    $('button[id="stop"]').hide();
};

// flip cell in DOM only (change CSS class)
var toggleCellInDOM = function(x, y) {
    var $cell = $('td[id="'+x+'-'+y+'"]');
    if ($cell.hasClass('live') || $cell.hasClass('dead')) {
        $cell.toggleClass('live dead');
    } else {
        $cell.addClass('live');
    }
};

// same as toggleCellInDOM, but with fadeTo effects (slower - use for small grid and high step interval)
var toggleCellInDOMWithEffects = function(x, y) {
    var $cell = $('td[id="'+x+'-'+y+'"]');
    if ($cell.hasClass('live')) {
        $cell.fadeTo(step_interval, 1);
        $cell.toggleClass('live dead');
    } else if ($cell.hasClass('dead')) {
        $cell.toggleClass('live dead');
        $cell.fadeTo(step_interval, 0.7);
    } else {
        $cell.fadeTo(step_interval, 0.7);
        $cell.addClass('live');
    }
};

// flip cell (toggle cell state in both array and DOM)
var toggleCell = function(x, y) {
    cells[y][x] = !cells[y][x];
    toggleCellInDOM(x, y);
};

// count cell neighbors using cell array
var countNeighbors = function(x, y, radius) {
    var count = 0;
    for (var row = y-radius; row <= y+radius; row++)
        for (var col = x-radius; col <= x+radius; col++)
            if (cells[row][col]) count++;
    if (cells[y][x]) count--; // Discount this cell, if live
    return count;
};

var countNeighborsToroidal = function(x, y, radius) {
    var count = 0;
    var xprime;
    var yprime;
    for (var row = y-radius; row <= y+radius; row++) {
        for (var col = x-radius; col <= x+radius; col++) {
            if (row < r) yprime = row + size;
            else if (row >= r + size) yprime = row - size;
            if (col < r) xprime = col + size;
            else if (col >= r + size) xprime = col - size;
            if (cells[yprime][xprime]) count++;
        }
    }
    if (cells[y][x]) count--;
    return count;
};

// step (advance automaton)
var step = function() {
    var actual_size = r + size + r;
    temp_cells = new Array(actual_size);
    for (var i = 0; i < actual_size; i++) temp_cells[i] = new Array(actual_size);
    var neighbor_count;
    // decide whether to use toroidal neighbor count
    var countFunc = (toroidal) ? countNeighborsToroidal : countNeighbors;
    // decide whether to include fadeTo effects (slower)
    var stepFunc = (size > 50 || step_interval < 200) ? toggleCellInDOM : toggleCellInDOMWithEffects;
    
    // call toggleCell for each cell, as needed - will update both boolean array and DOM.
    for (var row = r; row < (size + r); row++) {
        for (var col = r; col < (size + r); col++) {
            neighbor_count = countFunc(col, row, r);
            if (cells[row][col]) {
                // cell currently live
                if (neighbor_count < l || neighbor_count > o) {
                    temp_cells[row][col] = false;
                    stepFunc(col, row);
                } else temp_cells[row][col] = true;
            } else {
                // cell currently dead or uninitiated
                if ((neighbor_count > g_min-1) === true && (neighbor_count <= g_max) === true) {
                    temp_cells[row][col] = true;
                    stepFunc(col, row);
                } else temp_cells[row][col] = false;
            }
        }
    }
    cells = temp_cells;
};

// play (step at specified millisecond time interval)
var play = function() {
    // note: to play, isPlaying must be true (must be set in calling function)
    $('button[id="start"]').hide();
    $('button[id="stop"]').show();
    $('#control_panel #step').css('background-color', 'DarkGrey');
    toroidal = $('input:radio[name="edge_eval"]:checked').val() == 'toroidal';
    intervalID = setInterval(function() {
        if (isPlaying)
            step();
        else {
            clearInterval(intervalID);
            return;
        }
    }, step_interval);
};

// stop (halt automaton: if play() function will halt automaton if called)
var stop = function() {
    isPlaying = false;
    $('button[id="stop"]').hide();
    $('button[id="start"]').show();
    $('#control_panel #step').css('background-color', 'Aquamarine');
};

// change speed (i.e. step interval, in milliseconds)
var setStepInterval = function(new_interval) {
    if (isPlaying) {
        stop();
        clearInterval(intervalID);
        step_interval = new_interval;
        isPlaying = true;
        play();
    } else {
        step_interval = new_interval;
    }
};

// make grid from array (removes and replaces current table element)
var drawGridFromArray = function(cell_array) {
    stop();
    // Lastly, resize cells if grid too large:
    var viewsize = $(window).width() - $('#control_panel').width();
    if (viewsize > $(window).height()) {
        viewsize = $(window).height();
    }
    var cell_size = viewsize / size;
    
    var $grid_table = $('<table></table>');
    for (var row = r; row < size + r; row++) {
        var $row = $('<tr></tr>');
        for (var col = r; col < size + r; col++) {
            if (cell_array[row][col]) {
                $row.append('<td id="' + col + '-' + row + '" class="live"></td>');
            } else {
                $row.append('<td id="' + col + '-' + row + '"></td>');
            }
        }
        $grid_table.append($row);
    }
    $('#grid table').replaceWith($grid_table);
    $('td').css( { 'height': cell_size+'px', 'width': cell_size+'px' } );
};

// fill edge cells in array (helper method for setGrid)
var fillEdgeCells = function() {
    var actual_size = r + size + r;
    var fill_value = ($('input:radio[name="edge_eval"]:checked').val() == "live");
    for (var y = 0; y < r; y++) {
        for (var x = 0; x < actual_size; x++) {
            cells[y][x] = cells[y+actual_size-r][x] = fill_value; // top and bottom edges
        }
    }
    for (var y = r; y < actual_size-r; y++) {
        for (var x = 0; x < r; x++) {
            cells[y][x] = cells[y][x+actual_size-r] = fill_value; // middle-left and middle-right edges
        }
    }
};

// make new array and replace current grid in DOM
var setGrid = function(grid_fill_type) {
    // make new cell array
    size = parseInt($('#grid_size').val(), 10);
    var actual_size = r + size + r;
    cells = new Array(actual_size);
    for (var i = 0; i < actual_size; i++) {
        cells[i] = new Array(actual_size);
    }
    // fill non-edge cells first
    switch(grid_fill_type) {
        case gridFillType.clear: // fill with uninitiated cells
            for (var y = r; y < r+size; y++) {
                for (var x = r; x < r+size; x++) {
                    cells[y][x] = false;
                }
            }
            break;
        case gridFillType.random: // fill randomly
        default:
            var threshold = parseInt($('#randomize_density').val(), 10) / 100;
            for (var y = r; y < r+size; y++) {
                for (var x = r; x < r+size; x++) {
                    cells[y][x] = getRandomBoolean(threshold);
                }
            }
            break;
    }
    
    // fill edge cells
    fillEdgeCells();
    
    // using new array, draw new grid
    drawGridFromArray(cells);
};

// generate random boolean (for randomized grid)
var getRandomBoolean = function(thresh) {
    return Math.random() < thresh;
};