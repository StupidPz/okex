// ==UserScript==
// @name         Okex快捷下单
// @namespace    http://tampermonkey.net/
// @require      https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
// @require      https://cdn.bootcss.com/web-socket-js/1.0.0/web_socket.min.js
// @require      https://www.stupidpz.com/js/md5.js
// @require      https://www.stupidpz.com/js/hotkeys.min.js
// @require      https://cdn.bootcss.com/decimal.js/10.0.1/decimal.min.js
// @version      0.1
// @description  okex合约快捷下单插件
// @author       StupidPz
// @match        https://www.okex.com/future/full
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const a = new Decimal(0.05),
        b = new Decimal(0.02),
        c = new Decimal(0.001),
        d = new Decimal(-0.001),
        e = new Decimal(0.1),
        shiftKey = 'ctrl+',
        spab = "_7",   //7 卖一价+a 做多 平空
        spbb = "_4",   //4 卖一价+b 做多 平空
        bmcb = "_1",     //1 买一价-c 做多 平空
        bmdb = "_0",    // 买一价-d 做多 平空

        bmas = "_9",    //9 买一价-a 做空 平多
        bmbs = "_6",    //6 买一价-b 做空 平多
        bmcs = "_3",    //3 买一价-c 做空 平多
        smds = "_point",   //. 卖一价-d 做空 平多

        cancel_key = "_minus",   //撤平仓单
        banlance_key = "_plus", //快速平仓
        amount_1_key = "F1",  //单量1
        amount_2_key = "F2",  //单量2
        amount_3_key = "F3",  //单量3
        amount_4_key = "F4",  //单量4
        amount_1 = 1,
        amount_2 = 10,
        amount_3 = 20,
        amount_4 = 50,
        api_key = "db79907d-ed4f-48e3-b2d4-d7938e05a5ef",    //api设置
        api_secret = "C371185FCC939A1BA90FA263CB6FA661";

    function Trade(symbol, contract_type, price, amount, type, match_price, lever_rate) {
        //btc_usd ltc_usd eth_usd etc_usd bch_usd
        this.symbol = symbol;
        //合约类型 this_week:当周 next_week:下周 quarter:季度
        this.contract_type = contract_type;
        //价格
        this.price = price;
        //数量
        this.amount = amount;
        //1:开多 2:开空 3:平多 4:平空
        this.type = type;
        //	是否为对手价 0:不是 1:是 ,当取值为1时,price无效
        this.match_price = match_price;
        //杠杆倍数10 20
        this.lever_rate = lever_rate;

    }

    var quick = false,           //开启快捷键标识
        buy = new Decimal(0),    //买一价
        sell = new Decimal(0),   //卖一价
        last = new Decimal(0),   //盘口价
        trade = new Trade("eos_usd", "quarter", 0, 1, 1, 0, 20),
        sign = '',
        long_orderIds = [],
        short_orderIds = [],
        long_sell_orderIds = [],
        short_buy_orderIds = [],
        long_position_eveningup = '',
        short_position_eveningup = '';
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
    hotkeys.filter = function (event) {
        return quick;
    }
    //7 卖一价+a平空
    hotkeys(shiftKey + spab, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + spab);
        trade.type = 4;
        trade.price = sell.plus(a);
        futureTrade(trade);
        console.log("当前卖一价" + sell + ",平空价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    // 4 卖一价+b 平空
    hotkeys(shiftKey + spbb, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + spbb);
        trade.type = 4;
        trade.price = sell.plus(b);
        futureTrade(trade);
        console.log("当前卖一价" + sell + ",平空价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //1 买一价-c 平空
    hotkeys(shiftKey + bmcb, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + bmcb);
        trade.type = 4;
        trade.price = buy.minus(c);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",平空价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //卖一价+d 平空
    hotkeys(shiftKey + bmdb, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + bmdb);
        trade.type = 3;
        trade.price = sell.minus(d);
        futureTrade(trade);
        console.log("当前卖一价" + sell + ",平空价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //买一价-a 平多
    hotkeys(shiftKey + bmas, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + bmas);
        trade.type = 3;
        trade.price = buy.minus(a);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",平多价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //买一价-b 平多
    hotkeys(shiftKey + bmbs, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + bmbs);
        trade.type = 3;
        trade.price = buy.minus(b);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",平多价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //买一价-c 平多
    hotkeys(shiftKey + bmcs, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + bmcs);
        trade.type = 3;
        trade.price = sell.minus(c);
        futureTrade(trade);
        console.log("当前买一价" + sell + ",平多价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //卖一价-d 平多
    hotkeys(shiftKey + smds, function (event, handler) {
        event.preventDefault();
        console.log("press key " + shiftKey + smds);
        trade.type = 3;
        trade.price = buy.minus(d);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",平多价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //7 卖一价+a 做多
    hotkeys(spab, function (event, handler) {
        event.preventDefault();
        console.log("press key " + spab);
        trade.type = 1;
        trade.price = sell.plus(a);
        futureTrade(trade);
        console.log("当前卖一价" + sell + ",做多价格设置为" + trade.price + ",交易数量为" + trade.amount);
    });

    //4 卖一价+b 做多
    hotkeys(spbb, function (event, handler) {
        event.preventDefault();
        console.log("press key " + spbb);
        trade.type = 1;
        trade.price = sell.plus(b);
        futureTrade(trade);
        console.log("当前卖一价" + sell + ",做多价格设置为" + trade.price + "交易数量为" + trade.amount);
    });

    //1 买一价-c 做多
    hotkeys(bmcb, function (event, handler) {
        event.preventDefault();
        console.log("press key " + bmcb);
        trade.type = 1;
        trade.price = buy.minus(c);
        futureTrade(trade);
        console.log("当前买一价" + sell + ",做多价格设置为" + trade.price + "交易数量为" + trade.amount);
    });
    // 0 买一价-d 做多
    hotkeys(bmdb, function (event, handler) {
        event.preventDefault();
        console.log("press key " + bmdb);
        trade.type = 1;
        trade.price = buy.minus(d);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",做多价格设置为" + trade.price + "交易数量为" + trade.amount);
    });

    //9 买一价-a 做空
    hotkeys(bmas, function (event, handler) {
        event.preventDefault();
        console.log("press key " + bmas);
        trade.type = 2;
        trade.price = buy.minus(a);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",做空价格设置为" + trade.price + "交易数量为" + trade.amount);
    });

    // 6 买一价-b 做空
    hotkeys(bmbs, function (event, handler) {
        event.preventDefault();
        console.log("press key " + bmbs);
        trade.type = 2;
        trade.price = buy.minus(b);
        futureTrade(trade);
        console.log("当前买一价" + buy + ",做空价格设置为" + trade.price + "交易数量为" + trade.amount);
    });

    // 3 买一价-c 做空
    hotkeys(bmcs, function (event, handler) {
        event.preventDefault();
        console.log("press key " + bmcs);
        trade.type = 2;
        trade.price = buy.minus(c)
        futureTrade(trade);
        console.log("当前买一价" + buy + ",做空价格设置为" + trade.price + "交易数量为" + trade.amount);
    });

    //. 卖一价-d 做空
    hotkeys(smds, function (event, handler) {
        event.preventDefault();
        console.log("press key " + smds);
        trade.type = 2;
        trade.price = sell.minus(d);
        futureTrade(trade);
        console.log("当前卖一价" + sell + ",做空价格设置为" + trade.price + "交易数量为" + trade.amount);
    });
    //- 撤平仓单
    hotkeys(cancel_key, function (event, handler) {
        event.preventDefault();
        console.log("press key " + cancel_key);
        futureOrderInfo("-1");
        //获取到订单id之后在执行
        setTimeout(function () {
            let orderIds = long_sell_orderIds.concat(short_buy_orderIds);
            console.log("获取订单信息" + orderIds);
            if (orderIds.length > 0) {
                //debugger;
                futureCancelOrder(orderIds);
            }
        }, 500);
    });
    //+ 快速平仓
    hotkeys(banlance_key, function (event, handler) {
        event.preventDefault();
        console.log("press key " + banlance_key);
        futureOrderInfo("-1");
        //获取到订单id之后在执行
        setTimeout(function () {
            let orderIds = long_sell_orderIds.concat(short_buy_orderIds).concat(long_orderIds).concat(short_orderIds);
            console.log("获取订单信息" + orderIds);
            if (orderIds.length > 0) {
                //debugger;
                futureCancelOrder(orderIds);
            }
            if (long_position_eveningup > 0) {
                //debugger;
                //多仓可平数量
                trade.price = last.plus(e);
                trade.amount = long_position_eveningup;
                trade.type = 3;
                futureTrade(trade);
            }
            if (short_position_eveningup > 0) {
                //debugger;
                //空仓可平数量
                trade.price = last.plus(e);
                trade.amount = short_position_eveningup;
                trade.type = 4;
                futureTrade(trade);
            }
        }, 500);
    });
    hotkeys(amount_1_key, function (event, handler) {
        event.preventDefault();
        console.log("press key " + amount_1_key);
        trade.amount = amount_1;
        console.log("设置交易数量为" + trade.amount)
    });
    hotkeys(amount_2_key, function (event, handler) {
        event.preventDefault();
        console.log("press key " + amount_2_key);
        trade.amount = amount_2;
        console.log("设置交易数量为" + trade.amount)
    });
    hotkeys(amount_3_key, function (event, handler) {
        event.preventDefault();
        console.log("press key " + amount_3_key);
        trade.amount = amount_3;
        console.log("设置交易数量为" + trade.amount)
    });

    hotkeys(amount_4_key, function (event, handler) {
        event.preventDefault();
        console.log("press key " + amount_4_key);
        trade.amount = amount_4;
        console.log("设置交易数量为" + trade.amount)
    });

    var okCoinWebSocket = {};
    okCoinWebSocket.init = function (uri) {
        this.wsUri = uri;
        this.lastHeartBeat = new Date().getTime();
        this.overtime = 11000;

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
        //10s监测一次是否断开连接
        setInterval(checkConnect, 10000);
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
        // futurePositions();
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
                    // console.log("交易数据")
                    //console.log(e.data);
                } else if (channel === "ok_futureusd_orderinfo") {
                    //重置订单id
                    long_orderIds = [];
                    long_sell_orderIds = [];
                    short_orderIds = [];
                    short_buy_orderIds = [];
                    let orders = array[0].data.orders;
                    console.log(orders.length);
                    console.log(orders)
                    for (var i = 0; i < orders.length; i++) {
                        if (orders[i].type == "1") {
                            long_orderIds.push(orders[i].order_id);
                            console.log("做多订单号码为");
                            console.log(long_orderIds);
                        } else if (orders[i].type == "2") {
                            short_orderIds.push(orders[i].order_id);
                            console.log("做空订单号码为");
                            console.log(short_orderIds);
                        } else if (orders[i].type == "3") {
                            long_sell_orderIds.push(orders[i].order_id);
                            console.log("平多订单号码为");
                            console.log(long_sell_orderIds);
                        } else if (orders[i].type == "4") {
                            short_buy_orderIds.push(orders[i].order_id);
                            console.log("平空订单号码为");
                            console.log(short_buy_orderIds);

                        }
                    }
                } else if (channel === "ok_futureusd_cancel_order") {
                    console.log(e.data);
                } else if (channel === "ok_sub_futureusd_positions") {
                    let res = array[0].data.positions;
                    console.log("持仓信息");
                    //console.log(res);
                    for (var i = 0; i < res.length; i++) {
                        //20倍多仓
                        if (res[i].position == "1" && res[i].lever_rate == "20") {
                            long_position_eveningup = res[i].eveningup;
                            //20倍空仓
                        } else if (res[i].position == "2" && res[i].lever_rate == "20") {
                            short_position_eveningup = res[i].eveningup;
                        }
                    }
                } else if (channel === "ok_futureusd_trade") {
                    console.log(e.data);
                }
            }
        } else if (array.event == 'pong') {
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


//合约下单
    function futureTrade(trade) {
        sign = MD5("amount=" + trade.amount + "&api_key=" + api_key +
            "&contract_type=" + trade.contract_type + "&lever_rate=" + trade.lever_rate
            + "&match_price=0&price=" + trade.price + "&symbol=" + trade.symbol + "&type=" + trade.type + "&secret_key=" + api_secret);
        doSend("{'event': 'addChannel','channel':'ok_futureusd_trade','parameters': {'api_key': '"
            + api_key + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','contract_type': '"
            + trade.contract_type + "','amount': '" + trade.amount + "','price': '" + trade.price + "','type': '"
            + trade.type + "','match_price': '0','lever_rate': '" + trade.lever_rate + "'}}");
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
                sign = MD5("api_key=" + api_key + "&contract_type=" + trade.contract_type + "&order_id=" + arr.join(",")
                    + "&symbol=" + trade.symbol + "&secret_key=" + api_secret);
                doSend("{'event': 'addChannel','channel': 'ok_futureusd_cancel_order','parameters': {'api_key': '"
                    + api_key + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','order_id': '" + arr.join(",")
                    + "','contract_type': '" + trade.contract_type + "'}}");
            }
        } else if (0 < len <= 5) {
            sign = MD5("api_key=" + api_key + "&contract_type=" + trade.contract_type + "&order_id=" + orderIds.join(",")
                + "&symbol=" + trade.symbol + "&secret_key=" + api_secret);
            doSend("{'event': 'addChannel','channel': 'ok_futureusd_cancel_order','parameters': {'api_key': '"
                + api_key + "','sign': '" + sign + "','symbol': '" + trade.symbol + "','order_id': '" + orderIds.join(",")
                + "','contract_type': '" + trade.contract_type + "'}}");
        }
    }

//查询合约订单
//订单ID -1:查询指定状态的订单，否则查询相应订单号的订单
//status: 订单状态(0等待成交 1部分成交 2全部成交 -1撤单 4撤单处理中 5撤单中)
    function futureOrderInfo(orderId) {
        sign = MD5("api_key=" + api_key + "&contract_type=" + trade.contract_type + "&current_page=1&order_id=" + orderId
            + "&page_length=30&status=1&symbol=" + trade.symbol + "&secret_key=" + api_secret);
        console.log(sign)
        doSend("{'event': 'addChannel','channel': 'ok_futureusd_orderinfo','parameters': {'api_key': '"
            + api_key + "','sign': '" + sign + "','symbol': 'eos_usd','order_id': '" + orderId
            + "','contract_type': 'quarter','status':'1','current_page':'1','page_length':'30'}}");
    }


//订阅登录
    function login() {
        sign = MD5("api_key=" + api_key + "&secret_key=" + api_secret);
        doSend("{'event':'login','parameters':{'api_key':'" + api_key + "','sign':'" + sign + "'}}");
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
})
();