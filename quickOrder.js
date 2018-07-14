// ==UserScript==
// @name         Okex快捷下单
// @namespace    http://tampermonkey.net/
// @require      https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
// @require      https://cdn.bootcss.com/web-socket-js/1.0.0/web_socket.min.js
// @require      https://www.stupidpz.com/js/md5.js
// @require      https://cdn.bootcss.com/decimal.js/10.0.1/decimal.min.js
// @version      0.1
// @description  okex合约快捷下单插件
// @author       StupidPz
// @match        https://www.okex.com/future/full
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    //卖价买进2 买价卖出2
    var a = new Decimal(0.5),
        //卖价买进1 买价卖出1
        b = new Decimal(0.01),
        //买价买进1 卖价卖出1
        c = new Decimal(0.001),
        //买价买进2 卖价卖出2
        d = new Decimal(-0.001),
        e = new Decimal(0.1),
        buy = new Decimal(0),
        sell = new Decimal(0),
        last = new Decimal(0),
        quick = false,
        trade = {},
        sign = '',
        apikey = "db79907d-ed4f-48e3-b2d4-d7938e05a5ef",
        secret = "C371185FCC939A1BA90FA263CB6FA661",
        long_orderIds = [],
        short_orderIds = [],
        long_sell_orderIds = [],
        short_buy_orderIds = [],
        long_position_eveningup = '',
        short_position_eveningup = '';
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
        }
    };
    $(document).keydown(function (event) {
        //	1:开多 2:开空 3:平多 4:平空
        if (quick) {
            if (event.keyCode === 103) {
                //卖一价+a 买多;
                futureTrade(1, sell.plus(a));
            } else if (event.keyCode === 100) {
                //卖一价+b 买多
                futureTrade(1, sell.plus(b));
            } else if (event.keyCode === 97) {
                //买一价+c 买多
                futureTrade(1, buy.plus(c));
            } else if (event.keyCode === 96) {
                //买一价+d 买多
                futureTrade(1, buy.plus(d));
            } else if (event.keyCode === 105) {
                //卖一价 +a 买空
                futureTrade(2, buy.plus(a));
            } else if (event.keyCode === 102) {
                //买一价 +b 买空
                futureTrade(2, buy.plus(b));
            } else if (event.keyCode === 99) {
                //卖一价 +c 买空
                futureTrade(2, sell.plus(c));
            } else if (event.keyCode === 110) {
                //卖一价 +d 买空
                futureTrade(2, sell.plus(d));
            } else if (event.ctrlKey && event.keyCode === 103) {
                //卖一价+a 平空
                futureTrade(4, sell.plus(a));
            } else if (event.ctrlKey && event.keyCode === 100) {
                //卖一价+b 平空
                futureTrade(4, sell.plus(b));
            } else if (event.ctrlKey && event.keyCode === 97) {
                //买一价+c 平空
                futureTrade(4, buy.plus(c));
            } else if (event.ctrlKey && event.keyCode === 96) {
                //买一价+d 平空
                futureTrade(4, buy.plus(d));
            } else if (event.ctrlKey && event.keyCode === 105) {
                //买一价+a 平多
                futureTrade(3, buy.plus(a));
            } else if (event.ctrlKey && event.keyCode === 102) {
                //买一价+b 平多
                futureTrade(3, buy.plus(b));
            } else if (event.ctrlKey && event.keyCode === 99) {
                //卖一价+c 平多
                futureTrade(3, sell.plus(c));
            } else if (event.ctrlKey && event.keyCode === 110) {
                //卖一价+d 平多
                futureTrade(3, sell.plus(d));
            } else if (event.keyCode = 109) {
                //撤平仓单
                futureOrderInfo("-1");
                //获取到订单id之后在执行
                let timer = setInterval(function () {
                    let orderIds = long_sell_orderIds.concat(short_buy_orderIds);
                    console.log("获取订单信息" + orderIds);
                    if (orderIds.length > 0) {
                        futureCancelOrder(orderIds);
                        clearInterval(timer);
                    }
                }, 100);
            } else if (event.keyCode = 107) {
                //先取消所有订单
                futureOrderInfo("-1");
                //获取到订单id之后在执行
                let timer = setInterval(function () {
                    let orderIds = long_sell_orderIds.concat(short_buy_orderIds).concat(long_orderIds).concat(short_orderIds);
                    console.log("获取订单信息" + orderIds);
                    if (orderIds.length > 0) {
                        futureCancelOrder(orderIds);
                        clearInterval(timer);
                    }
                    //多仓可平数量
                    trade.amount = long_position_eveningup;
                    futureTrade(3, last.plus(e));
                    //空仓可平数量
                    trade.amount = short_position_eveningup;
                    futureTrade(4, last.plus(e));
                }, 100);

            }
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
        //5s监测一次是否断开连接
        setInterval(checkConnect, 5000);
    }

    function checkConnect() {
        okCoinWebSocket.websocket.send("{'event':'ping'}");
        if ((new Date().getTime() - okCoinWebSocket.lastHeartBeat) > okCoinWebSocket.overtime) {
            console.log("socket 连接断开，正在尝试重新建立连接");
            //testWebSocket();
        }
    }

    function onOpen(evt) {
        //订阅交易数据
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_eos_ticker_quarter'}");
        //登录
        login();
    }

    function onClose(evt) {
        print("DISCONNECTED");
    }

    function onMessage(e) {
        // console.log(new Date().getTime() + ": " + e.data)
        var array = JSON.parse(e.data);
        if (array.length > 0) {
            let channel = array[0].channel;

            if (channel != "undefined") {
                //订阅价格数据
                if (channel === "ok_sub_futureusd_eos_ticker_quarter") {
                    let data = array[0].data;
                    buy = new Decimal(data.buy), sell = new Decimal(data.sell), last = new Decimal(data.last);
                    //console.log(buy + "  " + sell + "  " + last);
                    //交易数据
                } else if (channel === "ok_sub_futureusd_trades") {
                    console.log("交易数据")
                    console.log(e.data);
                } else if (channel === "ok_futureusd_orderinfo") {
                    //重置订单id
                    long_orderIds = [];
                    long_sell_orderIds = [];
                    short_orderIds = [];
                    short_buy_orderIds = [];
                    let orders = array[0].data.orders;
                    for (var i = 0; i < orders.length; i++) {
                        if (orders[i].type == "1") {
                            long_orderIds.push(orders[i].order_id);
                        } else if (orders[i].type == "2") {
                            short_orderIds.push(orders[i].order_id);
                        } else if (orders[i] == "3") {
                            long_sell_orderIds.push(orders[i].order_id);
                        } else if (orders[i] == "4") {
                            short_buy_orderIds.push(orders[i].order_id);
                        }
                    }
                } else if (channel === "ok_futureusd_cancel_order") {
                    console.log(e.data);
                } else if (channel === "ok_sub_futureusd_positions") {
                    let data = array[0].data.positions;
                    console.log("持仓信息" + data);
                    for (var i = 0; i < data.length; i++) {
                        //多仓
                        if (data[i].position == "1") {
                            long_position_eveningup = data[i].eveningup;
                            //空仓
                        } else if (data[i].position == "2") {
                            short_position_eveningup = data[i].eveningup;
                        }
                    }
                }
            }
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
            console.log(e.data);
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
        sign = MD5("amount=0.1&api_key=" + apikey
            + "&symbol=ltc_usd&type=sell_market&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_spotusd_trade','parameters':{'api_key':'" + apikey
            + "','sign':'" + sign + "','symbol':'ltc_usd','type':'sell_market','amount':0.1}}");
    }

    //现货取消订单
    function spotCancelOrder(orderId) {
        sign = MD5("api_key=" + apikey + "&order_id=" + orderId
            + "&symbol=ltc_usd&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_spotusd_cancel_order','parameters':{'api_key':'" + apikey
            + "','sign':'" + sign + "','symbol':'ltc_usd','order_id':'" + orderId + "'}}");
    }

    //现货个人信息
    function spotUserInfo() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_spotusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //查询订单信息
    function spotOrderInfo() {
        sign = MD5("api_key=" + apikey + "&order_id=20914907&secret_key=" + secret + "&symbol=ltc_usd");
        doSend("{'event':'addChannel','channel':'ok_spotusd_orderinfo','parameters' :{'api_key':'"
            + apikey + "','symbol':'ltc_usd','order_id':'20914907','sign':'" + sign + "'}}");
    }

    //订阅交易数据
    function spotTrades() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_spotusd_trades','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //订阅账户信息
    function spotUserinfos() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_spotusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //合约下单
    function futureTrade(type, price) {
        sign = MD5("amount=" + trade.amount + "&api_key=" + apikey +
            "&contract_type=" + trade.contract_type + "&lever_rate=" + trade.lever_rate
            + "&match_price=0&price=" + price + "&symbol=" + trade.symbol + "&type=" + type + "&secret_key=" + secret);
        doSend("{'event': 'addChannel','channel':'ok_futureusd_trade','parameters': {'api_key': '"
            + apikey + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','contract_type': '"
            + trade.contract_type + "','amount': '" + trade.amount + "','price': '" + price + "','type': '"
            + type + "','match_price': '0','lever_rate': '20'}}");
    }

    //合约取消订单
    function futureCancelOrder(orderIds) {
        let len = orderIds.length;
        if (len > 5) {
            //需要发送请求的次数
            let times = Math.ceil(len / 5);
            let i = 0;
            let j = 0;
            while (i < times) {
                let arr = orderIds.slice(j, j + 5);
                j += 5;
                i++;
                sign = MD5("api_key=" + apikey + "&contract_type=" + trade.contract_type + "&order_id=" + arr.join(",")
                    + "&symbol=" + trade.symbol + "&secret_key=" + secret);
                doSend("{'event': 'addChannel','channel': 'ok_futureusd_cancel_order','parameters': {'api_key': '"
                    + apikey + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','order_id': '" + arr.join(",")
                    + "','contract_type': '" + trade.contract_type + "'}}");
            }
        } else if (0 < len <= 5) {
            sign = MD5("api_key=" + apikey + "&contract_type=" + trade.contract_type + "&order_id=" + orderIds.join(",")
                + "&symbol=" + trade.symbol + "&secret_key=" + secret);
            doSend("{'event': 'addChannel','channel': 'ok_futureusd_cancel_order','parameters': {'api_key': '"
                + apikey + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','order_id': '" + orderIds.join(",")
                + "','contract_type': '" + trade.contract_type + "'}}");
        }
    }

    //合约个人信息
    function futureUserInfo() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_futureusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //查询合约订单
    //订单ID -1:查询指定状态的订单，否则查询相应订单号的订单
    //status: 订单状态(0等待成交 1部分成交 2全部成交 -1撤单 4撤单处理中 5撤单中)
    function futureOrderInfo(orderId) {
        sign = MD5("api_key=" + apikey + "&contract_type=" + trade.contract_type + "&current_page=1&order_id=" + orderId
            + "&page_length=30&status=1&symbol=" + trade.symbol + "&secret_key=" + secret);
        console.log(sign)
        doSend("{'event': 'addChannel','channel': 'ok_futureusd_orderinfo','parameters': {'api_key': '"
            + apikey + "','sign': '" + sign + "','symbol': 'eos_usd','order_id': '" + orderId
            + "','contract_type': 'quarter','status':'1','current_page':'1','page_length':'30'}}");
    }


    //订阅合约交易数据
    function futureTrades() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_trades','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //订阅合约账户信息
    function futureUserinfos() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_userinfo','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }


    //订阅合约持仓信息
    function futurePositions() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'addChannel','channel':'ok_sub_futureusd_positions','parameters' :{'api_key':'"
            + apikey + "','sign':'" + sign + "'}}");
    }

    //订阅登录
    function login() {
        sign = MD5("api_key=" + apikey + "&secret_key=" + secret);
        doSend("{'event':'login','parameters':{'api_key':'" + apikey + "','sign':'" + sign + "'}}");
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