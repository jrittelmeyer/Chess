/*basic utils used in the js*/
// usage: log('inside coolFunc',this,arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function() {
    log.history = log.history || []; // store logs to an array for reference
    log.history.push(arguments);
    if (this.console) {
        console.log(Array.prototype.slice.call(arguments));
    }
}

function getPieceName(pieceValue){
    switch (pieceValue) {
        case WHITE_KING: return 'WHITE_KING';
        case WHITE_QUEEN: return 'WHITE_QUEEN';
        case WHITE_ROOK: return 'WHITE_ROOK';
        case WHITE_BISHOP: return 'WHITE_BISHOP';
        case WHITE_KNIGHT: return 'WHITE_KNIGHT';
        case WHITE_PAWN: return 'WHITE_PAWN';
        
        case BLACK_KING: return 'BLACK_KING';
        case BLACK_QUEEN: return 'BLACK_QUEEN';
        case BLACK_ROOK: return 'BLACK_ROOK';
        case BLACK_BISHOP: return 'BLACK_BISHOP';
        case BLACK_KNIGHT: return 'BLACK_KNIGHT';
        case BLACK_PAWN: return 'BLACK_PAWN';
        
        default: return 'EMPTY';
    }
}

var onDrop = function(event, ui) {

    var from = ui.draggable.parent().data('square');
    var to = $(this).data('square');
    
    if(validateMove(from, to, currentPlayer)){
        makeMove(from, to);
        var FEN = boardToFEN(board);
        syncMove(from, to, FEN);
    }else{
        // don't touch the board.
    }
    setTimeout(function(){drawBoard(board);},50);
}

$(function(){
    
    uidFromURL = getUrlParameterByName('game');
    uidFromCookie = Cookie.get('chess') ? JSON.parse(Cookie.get('chess')).uid : null;
    
    if (!uidFromURL) {
        if (!uidFromCookie) {
            var rnd = Math.random();
            uid = getNewUID() + (rnd > 0.5 ? '0' : '1');
        } else {
            uid = uidFromCookie;
        }
    } else {
        if (!uidFromCookie) {
            uid = uidFromURL;
        } else {
            if ((uidFromCookie.substr(0, uidFromCookie.length - 1) !== uidFromURL.substr(0, uidFromURL.length - 1)) &&
                confirm('Do you want to discard your current game and join this new game? ')) {
                uid = uidFromURL;
            } else {
                uid = uidFromCookie;
            }
        }
    }
    
    Cookie.set('chess', JSON.stringify( {
        uid: uid
    } ));
    
    uid = JSON.parse(Cookie.get('chess')).uid;
    
    user.color = (uid[uid.length - 1] === '1') ? 1 : 0 ;
    uid = uid.substr(0, uid.length - 1);
    
    opponentUid = uid + (user.color ? 0 : 1);
    
    $('#info .opponent-link').html('http://diovo.com/chess/?game=' + opponentUid).attr('href', '/chess/?game=' + opponentUid);
    
    refreshFromServer();
});

var user = {};

function drawBoard(board){
    var str = '';
    
    var showsDummyBoard = false; // when enabling this, set the board width to 800px in .css
    var showsSquareNumbers = true;
    
    var whichPlayer = user.color;
    var incr = whichPlayer ? 1 : -1;
    var start = whichPlayer ? 0 : 127;
    var end = whichPlayer ? 128 : -1;
    var rowStart = whichPlayer ? 0 : 15;
    var rowEnd = whichPlayer ? 15 : 0;
    
    
    for( var i = start ; i !== end ; i+= incr ){
        if( i % 16 === rowStart ) {
            str += '<div class="row">';
        }
        
        if(! (i & 0x88) ) {
            str += '<div class="column ' +
            ( (i & 0x1) ^ ((i >> 4)  & 0x1) ? 'dark': 'light') +
            '" data-square="' + i + '">' +
                '<div class="' + getPieceName(board[i]) + '">' +
                (showsSquareNumbers ? i.toString(16).toUpperCase() : '') +
                '</div>' +
            '</div>';
        }else if(showsDummyBoard){
            str += '<div class="column off ' +
            ( (i & 0x1) ^ ((i >> 4)  & 0x1) ? 'dark': 'light') +
            '" data-square="' + i + '">' +
                '<div class="' + getPieceName(board[i]) + '">' +
                (showsSquareNumbers ? i.toString(16).toUpperCase() : '') +
                '</div>' +
            '</div>';
        }
        
        if( i % 16 === rowEnd ) {
            str += '</div>';
        }
    }

    $('#board').html(str);
    
    $( ".column" ).droppable({
        drop: onDrop
    });
    
    $( ".column div" ).filter(function(){
        return true;    // todo -remove this line to enable 2-player game
        return $(this).attr('class').indexOf(user.color ? 'WHITE' : 'BLACK') !== -1;
    }).draggable({ revert: 'invalid' });
    
    
    $( ".column" ).mousedown(function(){
        $('.column').removeClass('red-border');
        for (var i = 0; i < 128; i++) {
            if(validateMove($(this).data('square'), i, currentPlayer)){
                $('.column').filter(function(){
                    return $(this).data('square') === i;
                }).addClass('red-border');
            }
        }
    });
    
    
    /* Show info */
    $('#info .moveCount').text('Moves elapsed: ' + Math.floor(moveCount/2));
    
}

function boardToFEN(board){
    var piece, emptySquares = 0, FEN = '';
    for(var i=0; i< 128; i++){
        if(! (i & 0x88) ) {
            var n = board[i];
            if((n & 0x07) === 0x07){ // queen
                piece = 'Q';
            }else if((n & 0x06) === 0x06){ // rook
                piece = 'R';
            }else if((n & 0x05) === 0x05){ // bishop
                piece = 'B';
            }else if((n & 0x03) === 0x03){ // king
                piece = 'K';
            }else if((n & 0x02) === 0x02){ // knight
                piece = 'N';
            }else if((n & 0x01) === 0x01){ // pawn
                piece = 'P';
            }
            
            if(n === 0){ // empty square
                piece = '';
                emptySquares++;
            }else{
                piece = emptySquares ? emptySquares + piece : piece;                
                emptySquares = 0;
            }
            
            if(n & 0x08){
                piece = piece.toLowerCase();
            }
            
            FEN += piece;
            
            if(i % 8 === 7){ // end of rank
                if(n === 0){
                   FEN += emptySquares;
                }
                emptySquares = 0;
                FEN += '/';
            }
        }
    }
    
    //whose turn?
    
    FEN = FEN.substr(0, FEN.length - 1) + ' ';
    FEN += currentPlayer === WHITE ? 'w' : 'b';
    FEN += ' KQkq - 0 0';
    
    //log(FEN);
    
    return FEN;
}

function FENToBoard(FEN){
    
    var pieceValueMap = {
        r: BLACK_ROOK,
        n: BLACK_KNIGHT,
        b: BLACK_BISHOP,
        q: BLACK_QUEEN,
        k: BLACK_KING,
        p: BLACK_PAWN,
        
        R: WHITE_ROOK,
        N: WHITE_KNIGHT,
        B: WHITE_BISHOP,
        Q: WHITE_QUEEN,
        K: WHITE_KING,
        P: WHITE_PAWN
    };
    
    var board = [];
    //FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    FEN = FEN.split(' ');
    for (var i = 0, len = FEN[0].length; i < len; i++) {
        
        var value = FEN[0][i];
        if(value === '/'){
            for(var j = 0; j < 8; j++){
                board.push(0);
            }
            continue;
        }
            
        if(isNaN(value)){
            board.push(pieceValueMap[value]);
        } else {
            for(var j = 0; j < parseInt(value, 10); j++){
                board.push(0);
            }
        }
    }
    
    for(var j = 0; j < 8; j++){
        board.push(0);
    }
    
    currentPlayer = FEN[1] === 'w' ? WHITE : BLACK;
    
    return board;
}


function syncMove(from, to, FEN){
    $.ajax({
        type: 'POST',
        url: '/py',
        data: {
            uid: uid,
            from: from,
            to: to,
            FEN: FEN,
            moveCount: moveCount
        },
        success: function(data){
            listenForRemoteMove();
        }
    });
}

// set unique cookie for every visitor 
function getNewUID() {
    return Math.floor(Math.random() * 100000000000000000);
}

// Extract values from the URL parameter
function getUrlParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

function listenForRemoteMove(){
    var pingCounter = setInterval(function(){
        //alert('hi');
        $.ajax({
            type: 'GET',
            url: '/py',
            data: {
                uid: uid,
                moveCount: moveCount
            },
            success: function(data){
                //log(data, data.moveCount, moveCount + 1);
                if(data.moveCount === moveCount + 1){
                    clearInterval(pingCounter);
                    makeMove(data.from, data.to);
                    drawBoard(board);
                    hightlightSquares([data.from, data.to]);
                }
            }
        });
    }, 3000);
}

function refreshFromServer(){
    $.ajax({
        type: 'GET',
        url: '/py',
        data: {
            uid: uid,
            moveCount: moveCount
        },
        success: function(data){
            //log(data, data.moveCount);
            if(data.moveCount !== -1){
                board = FENToBoard(data.FEN);
                moveCount = data.moveCount;
            }
            drawBoard(board);
            hightlightSquares([data.from, data.to]);
            if(user.color === moveCount % 2){
                listenForRemoteMove();
            }
        }, error: function(){
            $('#info .error').text('Could not connect to the server. You will not be able to play a multiplayer game');
            drawBoard(board);
        }
    });
}

function hightlightSquares(squares) {
    $('.column').removeClass('red-border');   
    for (var i = 0; i < squares.length; i++) {
        $('.column').filter(function(){
            return $(this).data('square') === squares[i];
        }).addClass('red-border');
    }
}

/*

Castling tests

FEN    =     "r3k2r/p1qbbppp/n7/1Np1pn2/2P2N2/1P1p4/PBQP1PPP/R3K2R b KQkq - 0 0";
board = FENToBoard(FEN);
drawBoard(board);

*/