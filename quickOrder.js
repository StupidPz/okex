// ==UserScript==
// @name         Okex快捷下单
// @namespace    http://tampermonkey.net/
// @require      https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
// @require      https://cdn.bootcss.com/web-socket-js/1.0.0/web_socket.min.js
// @require      https://cdn.bootcss.com/blueimp-md5/2.10.0/js/md5.min.js
// @require      https://cdn.bootcss.com/decimal.js/10.0.1/decimal.min.js
// @version      0.1
// @description  okex合约快捷下单插件
// @author       You
// @match        https://www.okex.com/future/full
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    var buy_add1 = new Decimal(-0.05),
        buy_add2 = new Decimal(0.01),
        sell_add1 = new Decimal(0.01),
        sell_add2 = new Decimal(0.01),
        buy = new Decimal(0),
        sell = new Decimal(0),
        last = new Decimal(0),
        quick = false,
        trade = {},
        apikey = "db79907d-ed4f-48e3-b2d4-d7938e05a5ef",
        secret = "C371185FCC939A1BA90FA263CB6FA661";
    //交易数量
    trade.amount = 1;
    //合约类型 this_week:当周 next_week:下周 quarter:季度
    trade.contract_type = 'quarter'
    //杠杆倍数
    trade.lever_rate = 20;
    //btc_usd ltc_usd eth_usd etc_usd bch_usd
    trade.symbol = "eos_usd";
    trade.price = 0;
    var tools = {
        getCookie: function (name) {
            var arr;
            var reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
            if (arr = document.cookie.match(reg))
                return unescape(arr[2]);
            else
                return null;
        },
        accAdd: function (arg1,arg2){
            var r1,r2,m;
            try{r1=arg1.toString().split(".")[1].length}catch(e){r1=0}
            try{r2=arg2.toString().split(".")[1].length}catch(e){r2=0}
            m=Math.pow(10,Math.max(r1,r2))
            return (arg1*m+arg2*m)/m
        }
    };

    $(document).keydown(function (event) {
        if (quick) {
            let type, price;
            if (event.keyCode === 103) {
                //卖价买进2
                type = 1;
                price = sell.plus(buy_add2);
            } else if (event.keyCode === 100) {
                //卖价买进1
                type = 1;
                price = tools.accAdd(sell, buy_add1);
            } else if (event.keyCode === 97) {
                type = 1;
                price = buy + buy_add1;
            } else if (event.keyCode === 96) {
                //买价买进2
                type = 1;
                price = buy + buy_add2;
            } else if (event.keyCode === 105) {
                //买价卖出2
                type = 2;
                price = buy + sell_add2;
            } else if (event.keyCode === 102) {
                //买价卖出1
                type = 2;
                price = buy + sell_add1;
            } else if (event.keyCode === 99) {
                //卖价卖出1
                type = 2;
                price = sell + sell_add1;
            } else if (event.keyCode === 110) {
                //卖价卖出2
                type = 2;
                price = sell + sell_add2;
            } else if (event.keyCode === 109) {
                console.log("撤单")
            } else if (event.keyCode === 102) {
                console.log("市价平")
            } else if (event.ctrlKey && event.keyCode === 103) {
                console.log("卖价买进2 平")
            } else if (event.ctrlKey && event.keyCode === 100) {
                console.log("卖价买进1 平")
            } else if (event.ctrlKey && event.keyCode === 97) {
                console.log("买价买进1 平")
            } else if (event.ctrlKey && event.keyCode === 96) {
                console.log("买价买进2 平")
            } else if (event.ctrlKey && event.keyCode === 105) {
                console.log("买价卖出2 平")
            } else if (event.ctrlKey && event.keyCode === 102) {
                console.log("买价卖出1 平")
            } else if (event.ctrlKey && event.keyCode === 99) {
                console.log("卖价卖出1 平")
            } else if (event.ctrlKey && event.keyCode === 110) {
                console.log("卖价卖出2 平")
            }
            futureTrade(type,price);
        }
    });

    var okCoinWebSocket = {};
    okCoinWebSocket.init = function (uri) {
        this.wsUri = uri;
        this.lastHeartBeat = new Date().getTime();
        this.overtime = 8000;

        okCoinWebSocket.websocket = new WebSocket(okCoinWebSocket.wsUri);

        okCoinWebSocket.websocket.onopen = function (evt) {
            onOpen(evt)
        };
        okCoinWebSocket.websocket.onclose = function (evt) {
            onClose(evt)
        };
        okCoinWebSocket.websocket.onmessage = function (evt) {
            onMessage(evt)
        };
        okCoinWebSocket.websocket.onerror = function (evt) {
            onError(evt)
        };
        //30s监测一次是否断开连接
        setInterval(checkConnect,30000);
    }
    function checkConnect() {
        okCoinWebSocket.websocket.send("{'event':'ping'}");
        if ((new Date().getTime() - okCoinWebSocket.lastHeartBeat) > okCoinWebSocket.overtime) {
            console.log("socket 连接断开，正在尝试重新建立连接");
            //testWebSocket();
        }
    }

    function onOpen(evt) {
        console.log("websocket连接成功");
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_eos_ticker_quarter'}");

    }

    function onClose(evt) {
        print("DISCONNECTED");
    }

    function onMessage(e) {
        // console.log(new Date().getTime() + ": " + e.data)
        var array = JSON.parse(e.data);
        if (array.length > 0) {
            let channel = array[0].channel;
            if (channel != "undefined" && channel === "ok_sub_futureusd_eos_ticker_quarter") {
                let data = array[0].data;
                buy = new Decimal(data.buy), sell = new Decimal(data.sell), last = new Decimal(data.last);
                //console.log(buy + "  " + sell + "  " + last);
            }else(
                console.log(array)
            )
        }
        /*for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < array[i].length; j++) {
                var isTrade = false;
                var isCancelOrder = false;
                if (array[i][j] == 'ok_spotusd_trade' || array[i][j] == 'ok_spotcny_trade') {
                    isTrade = true;
                } else if (array[i][j] == 'ok_spotusd_cancel_order'
                    || array[i][j] == 'ok_spotcny_cancel_order') {
                    isCancelOrder = true;
                }

                var order_id = array[i][j].order_id;
                if (typeof (order_id) != 'undefined') {
                    if (isTrade) {
                        //下单成功 业务代码
                        console.log("orderId is  " + order_id);
                    } else if (isCancelOrder) {
                        //取消订单成功 业务代码
                        console.log("order  " + order_id + " is now cancled");
                    }
                }
            }
        }*/
        else if (array.event == 'pong') {
            okCoinWebSocket.lastHeartBeat = new Date().getTime();
        } else {
            //createTable(array);
        }
    }

    function onError(evt) {
        print('<span style="color: red;">ERROR:</span> ' + evt.data);
    }

    function doSend(message) {
        console.log("SENT: " + message);
        okCoinWebSocket.websocket.send(message);
    }

    function print(message) {
        console.log(message);
    }

    function createTable(array) {
        var str = '<table id="tdata" border="1">\r\n<tr id="tr0">\r\n';
        for (var index in array[0]) {
            str += '<th>' + index + '</th>\r\n';
        }
        str += '</tr>\r\n';
        for (var i = 0; i < array.length; i++) {
            str += '<tr id="tr' + (i + 1) + '">\r\n';
            for (var j in array[i]) {
                str += '<td>' + JSON.stringify(array[i][j]) + '</td>\r\n';
                //if(typeof array[i][j] == 'string' && array[i][j].indexOf("ok_") >= 0) {
                //console.log(array[i][j]);
                //}
            }
            str += '</tr>\r\n';
        }

        str += '</table>\r\n';
        document.getElementById("output").innerHTML = str;
    }

    //现货下单
    function spotTrade() {
        var sign = md5("amount=0.1&api_key=" + apikey
            + "&symbol=ltc_usd&type=sell_market&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_spotusd_trade','parameters':{'api_key':'" + apikey
            + "','sign':'" + sign + "','symbol':'ltc_usd','type':'sell_market','amount':0.1}}");
    }

    //现货取消订单
    function spotCancelOrder(orderId) {
        var sign = md5("api_key=" + apikey + "&order_id=" + orderId
            + "&symbol=ltc_usd&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_spotusd_cancel_order','parameters':{'api_key':'" + apikey
            + "','sign':'" + sign + "','symbol':'ltc_usd','order_id':'" + orderId + "'}}");
    }

    //现货个人信息
    function spotUserInfo() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_spotusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //查询订单信息
    function spotOrderInfo() {
        var sign = md5("api_key=" + apikey + "&order_id=20914907&secret_key=" + secret + "&symbol=ltc_usd");
        doSend("{'event':'addChannel','channel':'ok_spotusd_orderinfo','parameters' :{'api_key':'"
            + apikey + "','symbol':'ltc_usd','order_id':'20914907','sign':'" + sign + "'}}");
    }

    //订阅交易数据
    function spotTrades() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_spotusd_trades','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //订阅账户信息
    function spotUserinfos() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_spotusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //合约下单
    function futureTrade(type,price) {
        var sign = md5("amount=1&api_key=" + apikey +
            "&contract_type=this_week&lever_rate=20&match_price=1&price=1.5&symbol=ltc_usd&type=0&secret_key=" + secret);
        doSend("{'event': 'addChannel','channel':'ok_futureusd_trade','parameters': {'api_key': '"
            + apikey + "','sign': '" + sign + "','symbol': 'ltc_usd','contract_type': 'this_week','amount': '1','price': '1.5','type': '0','match_price': '1','lever_rate': '20'}}");
        /*var sign = md5("amount=" + trade.amount + "&api_key=" + apikey +
            "&contract_type=" + trade.contract_type + "&lever_rate=" + trade.lever_rate + "&match_price=0&price="+price+"&symbol=" + trade.symbol + "&type="+type+"&secret_key=" + secret);
        doSend("{'event': 'addChannel','channel':'ok_futureusd_trade','parameters': {'api_key': '"
            + apikey + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','contract_type': '" + trade.contract_type + "','amount': '" + trade.amount + "','price': '" + price + "','type': '"+type+"','match_price': '1','lever_rate': '20'}}");*/
    }

    //合约取消订单
    function futureCancelOrder(orderId) {
        var sign = md5("api_key=" + apikey + "&contract_type=this_week&order_id=" + orderId
            + "&symbol=ltc_usd&secret_key=" + secret);
        doSend("{'event': 'addChannel','channel': 'ok_futureusd_cancel_order','parameters': {'api_key': '"
            + apikey + "','sign': '" + sign + "','symbol': 'ltc_usd','order_id': '" + orderId
            + "','contract_type': 'this_week'}}");
    }

    //合约个人信息
    function futureUserInfo() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_futureusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //查询合约订单
    function futureOrderInfo(orderId) {
        var sign = md5("api_key=" + apikey + "&contract_type=this_week&current_page=1&order_id=" + orderId
            + "&page_length=1&symbol=ltc_usd&secret_key=" + secret + "&status=1");
        doSend("{'event': 'addChannel','channel': 'ok_futureusd_orderinfo','parameters': {'api_key': '"
            + apikey + "','sign': '" + sign + "','symbol': 'ltc_usd','order_id': '" + orderId
            + "','contract_type': 'this_week','status':'1','current_page':'1','page_length':'1'}}");
    }

    //订阅合约交易数据
    function futureTrades() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_trades','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //订阅合约账户信息
    function futureUserinfos() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }


    //订阅合约持仓信息
    function futurePositions() {
        var sign = md5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_positions','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    $(document).ready(function () {
        //获取cookie中的登录信息
        var token = tools.getCookie('accsess_token_okex');
        //添加快捷键开关
        var open = '<div class="auto-convert"><div class="switch" id="quick"><div class="switch-bar"></div></div><span>开启快捷键</span></div>'
        $('div[class="right-operations"]').append(open);
        $("#quick").click(function () {
            if (!quick) {
                quick = true;
                $(this).addClass("on");
                $(this).children('div').addClass("on");
            } else {
                quick = false;
                $(this).removeClass("on");
                $(this).children('div').removeClass("on");
            }
        })
        //登陆窗口
        if (token == null || token == 'undefined') {
            //alert("执行了");
            var appendHtml = '<div id="login">\n' +
                '   <div data-reactroot="" class="react-confirm-alert-overlay">\n' +
                '    <div class="react-confirm-alert conform dark">\n' +
                '     <div>\n' +
                '      <div class="header border-b">\n' +
                '       <!-- react-text: 5 -->登录\n' +
                '       <!-- /react-text -->\n' +
                '       <div class="close" id= "close">\n' +
                '        &times;\n' +
                '       </div>\n' +
                '      </div>\n' +
                '      <div class="padding-20">\n' +
                '       <div>\n' +
                '        <div class="confirm-dialog-content explain">\n' +
                '\t\t\t<span class="form-label">用户名:</span><input type = "text" name=\'username\' class="form-input">\n' +
                '\t\t\t<span class="form-label">密码:</span><input type = "password" name = "password" class="form-input ">\n' +
                '        </div>\n' +
                '        <!-- react-empty: 10 -->\n' +
                '       </div>\n' +
                '      </div>\n' +
                '      <div class="react-confirm-alert-button-group border-t flex-right">\n' +
                '       <button class="cancel" id="cancel">取消</button>\n' +
                '       <button class="confirm" id= "submit">登录</button>\n' +
                '      </div>\n' +
                '     </div>\n' +
                '    </div>\n' +
                '   </div>\n' +
                '  </div>'


            var appendDiv = '<div id="status"></div>\n' +
                '<div id="output"></div>'
            //$(document.body).append(appendHtml).append(appendDiv);
            $("#cancel,#close").click(function () {
                $("#login").remove();
            });
            okCoinWebSocket.init("wss://real.okex.com:10440/websocket/okexapi");
        }
    });
})();