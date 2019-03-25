; (function () {
    var _toString = function () { return Object.prototype.toString; }
    function isObject(obj) {
        return typeof obj === 'object';
    }
    function isNumber(str) {
        return _toString.call(str) === '[object Number]';
    }
    function isArray(arr) {
        if (isObject(arr)) {
            return _toString.call(arr) === '[object Array]';
        }
        return false;
    }
    var xui = new function () {
        var self = this;
        this.__doid = 0;
        this.inherit = function (child, parent) {
            child.prototype = Object.create(parent.prototype);
            child.prototype.constructor = child;
            child.prototype._super = parent.prototype;
        }
        this.class = function (namepath, params) {
            var contrs = params.constructor;
            var _parent = params.extends;
            var ns, cls, name;
            cls = function () {
                _parent && _parent.apply(this, arguments);
                contrs && contrs.apply(this, arguments);
            }
            _parent && self.inherit(cls, _parent);
            for (var k in params) {
                if (k == 'constructor' || k == 'extends') continue;
                cls.prototype[k] = params[k];
            }
            if (namepath) {
                ns = namepath.split('.');
                name = ns[ns.length - 1];
                for (var i = 0, len = ns.length; i < len; i++) {
                    if (ns[i] !== name) {
                        ns[i] = self[ns[i]]
                        if (!ns[i]) {
                            ns[i] = {};
                        }
                    }
                }
                self[name] = cls;
                cls.prototype.class = namepath;
            }
            return cls;
        }
        var modules = [];
        this.install = function (name, module) {
            modules.push({ name: name, module: module });
        }
        this.getModules = function () {
            return modules;
        }
    }
    xui.isObject = isObject;
    xui.isNumber = isNumber;
    xui.isArray = isArray;


    window.xui = xui;
})();

(function ($, root, undefined) {
    "use strict"
    function watch(key, value) {
        this.key = key;
        this.value = value;
    }

    function checker(isUpdate) {
        this.watchs = [];
        this.isDirty = false;
        this.isUpdate = isUpdate || false;
        this.oldWatchs = [];
        this.dirtyList = [];
    }
    checker.prototype.addWatch = function (key, value) {
        this.watchs.push(new watch(key, value));
        this.oldWatchs.push(new watch(key, value));
    }
    checker.prototype.checkWatchs = function (callback) {
        var self = this;
        var flag = false;
        $.each(this.watchs, function (key, item) {
            $.each(self.oldWatchs, function (ii, obj) {
                if (item.key == obj.key) {
                    if (item.value != obj.value) {
                        self.$apply(item, obj);
                        if (self.dirtyList.length > 0) {
                            var dirty = $.grep(self.dirtyList, function (iii, nnn) {
                                if (iii.key == obj.key) {
                                    return true;
                                }
                            });
                            if (dirty.length == 0) {
                                self.dirtyList.push(item);
                            }
                        } else {
                            self.dirtyList.push(item);
                        }

                        self.isDirty = true;
                        flag = true;
                        callback && callback();
                        $(document.body).trigger('xmsChecker.dirty', { obj: obj, item: item, checker: self });
                    }
                }
            });
        });
        if (flag == false) {
            self.isDirty = false;
        }
    }
    checker.prototype.$apply = function (item) {
        if (this.isUpdate) {
        }
    }
    checker.prototype.setValue = function (key, value) {
        $.each(this.watchs, function (i, item) {
            if (item.key == key) {
                item.value = value;
                return false;
            }
        });
    }
    root.xmsDirtyChecker = checker;
})(jQuery, window);

!(function ($, root, un) {
    $.XmsUI = {};
    
    function getLeftFormular(items, isLeft) {//isLeft   需计算的字段是否在字段左边
        var arr = [];
        $.each(items, function (i, n) {
            if (n == "=") {
                return false;
            } else {
                if (!checkFormularRuler(n)) {
                    arr.push(n);
                }
            }
        });
        if (isLeft) {
            arr = arr.reverse();
        }
        return arr;
    }
    function checkFormularRuler(nn) {
        var temp = nn;
        nn = {}; nn.key = temp;
        return nn.key == "+" || nn.key == "-" || nn.key == "*" || nn.key == "/" || nn.key == "=" || nn.key == "(" || nn.key == ")";
    }

    function getFormularResult(leftArr, leftStr, rights, context) {//左边的字段，左边的等式

        $.each(leftArr, function (key, item) {
            var itemname = item;
            var itemObj = $("td[data-field='" + itemname.toLowerCase() + "'] input.xui-editor-input", context);
            var itemVal = itemObj.val().replace(/\,/g, '');
            var reg = new RegExp(itemname.toLowerCase());
            leftStr = leftStr.toLowerCase().replace(reg, itemVal);
        });
        var res = 0;
        try {
            res = eval(leftStr);//计算公式
            var rightobj = $("td[data-field='" + rights.toLowerCase() + "'] input.xui-editor-input", context);
            var type = rightobj.attr('data-type');
            var precision = rightobj.attr('data-precision') * 1;
            if (type == 'money' && res && res != '') {
                res = (res * 1).toFixed(precision || 2);
            }
            rightobj.val(res);
        } catch (e) {
            // console.log(e);
        }
    }

    //默认顶部工具按钮
    var defaultTools = [
        {
            'target': null, 'type': 'button', 'event': 'click', 'handler': function ( grid, e) {
                
            }, name: 'create', 'text': '新建', 'position': 'top', 'float': 'left'
        },
        {
            'target': null, 'type': 'button', 'event': 'click', 'handler': function (grid, e) {
                grid.addRow();
            }, name: 'addrow', 'text': '新增行', 'position': 'top', 'float': 'left'
        },
        {
            'target': null, 'type': 'button', 'event': 'click', 'handler': function (grid, e) {
                grid.refresh();
            }, name: 'reflresh', 'text': '刷新', 'position': 'top', 'float': 'left'
        }
    ]

    var defaults = {
        source: {},
        defaultHeight: '400',
        btntools: defaultTools,
        forzen: true,
        primarykey: null,
        editmode: 'cell',
        methods: {},
        formular:null,//行计算规则
        columns: [
            { text: 'First Name', datafield: 'firstname', width: 100 },
            { text: 'Last Name', datafield: 'lastname', width: 100 },
            { text: 'Product', datafield: 'productname', width: 180 },
            { text: 'Quantity', datafield: 'quantity', width: 80, cellsalign: 'right' },
            {
                text: 'Unit Price', datafield: 'price', width: 90, cellsalign: 'right',
                isedit: true,
                edittype: 'picklist',
                picklist: [{ name: '1个', value: '1' }, { name: '2个', value: '1' }, { name: '3个', value: '1' }],
                cellsformat: 'c2'
            },
            {
                text: 'Total', datafield: 'total', width: 100, cellsalign: 'right', cellsformat: 'c2', columntype: 'numberinput',
                isedit: true,
                edittype:'defaultText',
                initEdit: function (dom, grid, griddata) {
                    //editor.jqxNumberInput({ decimalDigits: 0 });
                    //console.log(dom, grid, griddata);
                }, validation: function (cell, value) {
                    var year = value.getFullYear();
                    if (year >= 2013) {
                        return { result: false, message: "Ship Date should be before 1/1/2013" };
                    }
                    return true;
                }
                , initsort: function () { }
            }
        ]
        , width: 0
        , allSaveHandler: function () { }
        , rowSaveHandler: function () { }
        , cellSaveHandler: function () { }
    }
    function getRandomId() {
        return ((Math.random() * 100000) >> 0).toString(16) + ((Math.random() * 100000) >> 0).toString(16) + ((Math.random() * 100000) >> 0).toString(16);
    }
    function xmsDataGrid(obj,opts) {
        this.$box = $(obj);
        this.columns = opts.columns;//列配置数据
        this.apaxData = opts.source;
        this.opts = opts;
        this.datas = [];
        this._oldSource = [];
        this.__grid_id = getRandomId();
        this.currentLength = 0;
        this.state = 0;//0初始化，1未编辑，2编辑中
        this.editState = 1; //1验证通过，0验证未通过

        this.dataChecker = new xmsDirtyChecker();//暂时未用到

        //整个grid验证状态
        this.allValidate = 0;//所有数据验证完成后方可提交

        //行计算规则
        this.formular = this.opts.formular;
        
        //dom页面相关容器
        var grid_w=this.gridWidth = this.opts.width ? ' width:' + this.opts.width + 'px;' : this.$box.width();
        var forzencss = 'xui-gridbox-forzen';
        this.defaultRowWidth = 0;//在表格头部渲染时可计算得出
        this.$grid = $('<div class="xui-gridbox ' + forzencss+' " style="' + grid_w + '" id="grid_' + this.__grid_id+'"></div>');
        this.$gridWrap = $('<div class="xui-gridwrap"></div>');
        this.$gridtable = $('<div class="xui-gridtable" style=""></div>');
        this.$gridtheader = $('<div class="xui-gridtheader"></div>');
        this.$gridtbody = $('<div class="xui-gridtbody" ></div>');
        this.$gridtfooter = $('<div class="xui-gridtfooter" ></div>');
        this.$pager = $('<div class="xui-grid-pager"></div>');
        this.$topBtnTools = $('<div class="xui-grid-topbtntools clearfix"></div>');
        this.$bottomBtnTools = $('<div class="xui-grid-bottombtntools"></div>');
        this.$filterWrap = $('<div class="xui-grid-filterwrap"></div>');
        this._rowEditState = 0;//行编辑状态，0：没有行在编辑，1：有1行正在编辑中  ？编辑时验证输入信息是否正确
        this.init();
    }
    //初始化
    xmsDataGrid.prototype.init = function () {
        
        this.$grid.append(this.$topBtnTools);
        this.$grid.append(this.$gridWrap);
        this.$gridWrap.append(this.$gridtable).append(this.$gridtheader);;
        this.$gridtable
            .append(this.$gridtbody)
            .append(this.$gridtfooter);
        this.$box.append(this.$grid);
        this.getData();
    }
    xmsDataGrid.prototype.addRow = function () {
        if (this.editModelValidate == false) return false;//如有编辑状态的元素未验证通过则无法添加行
        var self = this, $gridTrWrap = self.$gridtbody.find('tbody:first'), childLength = $gridTrWrap.children('tr.xui-grid-body-row').length;
        var trhtml = this._addRowHtml(1), $tr = $(trhtml);
        $gridTrWrap.append($tr);
        self.bodyBindEdit();//绑定编辑事件
        //触发编辑事件，
        if (self.opts.editmode == 'row') {
            setTimeout(function () {
                $tr.trigger('click.xui-grid-editrow');
                $tr.find('.xui-grid-editcell:first').find('input').focus();
            }, 100);
        } else {
            $tr.find('.xui-grid-editcell').each(function (e) {
                $(this).trigger('click.xuigridCell');
            })
        }
        this.state = 2;
    }
    xmsDataGrid.prototype._addRowHtml = function (count,datas) {
        var count = count || 1;
        var self = this, $gridTrWrap = self.$gridtbody.find('tbody:first');
        var columns = this.opts.columns;
        var htmls = [], ths = [];
        var primarykey = this.opts.primarykey;
        var __keyname = primarykey ? primarykey : 'id';
        for (var k = 0; k < count; k++) {
            var j = this.currentLength++;
            var __id = primarykey ? (item[primarykey] ? item[primarykey] : getRandomId()) : getRandomId();
            htmls.push('<tr class="xui-grid-body-row" id="gridid_' + this.__grid_id + 'row' + j + '" data-id="' + __id + '">');
            var tds = [], trDatas = (datas && datas[k]||{});
            for (var i = 0, len = columns.length; i < len; i++) {
                var item = columns[i];
                trDatas[item.datafield] = trDatas[item.datafield] ? trDatas[item.datafield] : '';
                trDatas[__keyname] = trDatas[__keyname] ? trDatas[__keyname] : __id;
                var isedit = item.isedit ? ' xui-grid-editcell ' : '';
                if (!item.width) { item.width = 100; };
                var _w = item.width ? ' width:' + item.width + 'px;' : '', _align = item.cellsalign ? ' text-align:' + item.cellsalign : '';
                tds.push('<td class="xui-grid-tbody-cells ' + isedit + '" style="' + _w + _align + '" data-field="' + item.datafield + '">' + trDatas[item.datafield]+'</td>');
            }
            
            htmls.push(tds.join(''));
            htmls.push('</tr>');
        }
        return htmls.join('');
    }
    xmsDataGrid.prototype.createBtnTools = function () {
        var self = this, opts = self.opts, btns = opts.btntools;
        var $top = self.$topBtnTools, $bottom = self.$bottomBtnTools;
        $.each(btns, function (key, item) {
            item._super = self;
            if (item.position == 'top') {
                item.context = $top;
            } else {
                item.context = $bottom;
            }
            
            var btn = new xui.xuiBtn(item);
        });
    }
    xmsDataGrid.prototype.updata = function () {
        var self = this;
        setTimeout(function () {
            self.datas.localdata = getTestData();
            self.clear();
            self.render();
        });
    }
    xmsDataGrid.prototype.refresh = function () {
        this.clear();
        this.getData();
    }
    xmsDataGrid.prototype.setOpts = function (opts) {
        this.opts = $.extend({}, this.opts, opts);
    }
    xmsDataGrid.prototype.clear = function () {
        //清除内容区域
        this.$gridtheader.empty();
        this.$gridtbody.empty();
        this.$gridtfooter.empty();
        this.$pager.empty();
        this.$topBtnTools.empty();
        this.$bottomBtnTools.empty();
    }
    xmsDataGrid.prototype.setHeight = function (height) {
        var theadH = this.$gridtheader.outerHeight();
        this.$box.css('height', height);
        this.$gridtbody.css({ 'height': height - theadH, 'margin-top': theadH });
    }
    xmsDataGrid.prototype.headerBindFilter = function () {
        var self = this;
        this.$gridtheader.find('th>span.xui-grid-header-cell-label').off('click.xui-grid-header').on('click.xui-grid-header', function (e) {
            var $this = $(this), $par = $this.parent(), _field = $par.attr('data-field');
            var opts = {
                filter: {}};
            self.updata(opts);
        });
    }
    xmsDataGrid.prototype.headerBindresize = function () { }
    //如果有右侧滚动条时，需要对宽度做处理
    xmsDataGrid.prototype.fixHeaderWidth = function () {
        var gridbodyH = this.$gridtbody.height();
        var gridHeightW = this.$gridtheader.width();
        var gridtableH = this.$gridtbody.children().height();
        var gridW = this.$grid.width();
        var offsetW = 16;
        if (gridbodyH < gridtableH) {
            this.$gridtheader.css('width', gridW < gridHeightW + offsetW ? gridHeightW - offsetW : gridHeightW);
            this.$gridtheader.children('table').css('width', gridHeightW - offsetW);
        }
    }
    xmsDataGrid.prototype.setData = function (datas) {
        this.datas = datas;
    }
    //ajax提交
    xmsDataGrid.prototype.updataData = function () {
        
    }
    //local数据修改
    xmsDataGrid.prototype.changeData = function (rowid) {

    }
    xmsDataGrid.prototype.findTypeColumn = function (field) {
        var type = $.grep(this.opts.columns,function (item,key) {
            return item.datafield == field;
        });
        
        return type&&type.length>0?type[0]:null;
    }
    xmsDataGrid.prototype.findColEditer = function (field) {
        var column = ColumnEdits.find(field);
        if (column) {
            return column;
        }
        return null;
    }
    xmsDataGrid.prototype.gridBindScroll = function () {
        var self = this;
        this.$gridtable.on('scroll', function () {
           // console.log(this.scrollLeft)
            var sleft = this.scrollLeft;
            self.$gridtheader.scrollLeft(sleft);
        });
    }
    //使行变为可编辑
    xmsDataGrid.prototype.editRow = function ($row,e) {
        var self = this;
        if (self._rowEditState == 1) return true;
        var that = $row;
        $($row).find('.xui-grid-editcell').each(function () {
           // console.log($(this))
            $(this).trigger('xuievent.xui-grid-edit');
        });
        self._rowEditState = 1;
        self.$box.off('click.xui-grid-roweditblur').on('click.xui-grid-roweditblur', function (e) {
            if ($(e.target).closest($(that)).length == 0) {
                if (self._rowEditState == 1) {
                    $(that).find('.xui-grid-editcell').each(function () {
                        $(this).find('input').trigger('xuievent.xui-grid-editblur');
                    });
                    self._rowEditState = 0;
                }
            }
        })
        
    }
    //使单元格变为可编辑
    xmsDataGrid.prototype.editCell = function (cell,e) {
        var self = this;
        var field = $(cell).attr('data-field');
        var editer = self.findTypeColumn(field);//查找对应的编辑方式
        editer = self.findColEditer(editer.edittype);
        if (editer) {
            //变为可编辑元素
            var _edit = new editer(cell, {
                rendered: function ($input, $box, data, xuiediter) {
                    $input.focus();
                }
            });
            $(cell).off('click.xuigridCell').on('click.xuigridCell', function () {
                var that = this;
                $(this).trigger('xuievent.xui-grid-edit');
                var count = 0;
                $(that).find('input').on('blur', function (e) {
                    $(that).find('input').trigger('xuievent.xui-grid-editblur').trigger('change');
                })
            });

        }
    }
    
    xmsDataGrid.prototype.bodyBindEdit = function () {
        var self = this;
        if (self.opts.editmode == 'cell') {
            self.$gridtbody.find('.xui-grid-editcell').each(function (e) {
                self.editCell(this,e);
            })
        } else if (self.opts.editmode == 'row') {
            var $rows = self.$gridtbody.find('tr');
            $rows.find('.xui-grid-editcell').each(function (e) {
                var field = $(this).attr('data-field');
                var editer = self.findTypeColumn(field);
                editer = self.findColEditer(editer.edittype);
                if (editer) {
                    //变为可编辑元素
                    var _edit = new editer(this, {});
                }
            })
            $rows.off('click.xui-grid-editrow').on('click.xui-grid-editrow', function (e) {
                self.editRow(this, e);
            });
        }
        
    }
    //添加行计算
    xmsDataGrid.prototype.bindFormularEvent = function () {
        var self = this;
        if (this.formular == null) return;
        //解析
        $.each(this.formular, function (i,n) {
            var keys = n.eventKeys;
            var ruler = n.ruler;
            $.each(keys, function (ii, nn) {
                self.$gridtbody.find('tbody>tr').find('td').each(function (iii, nnn) {
                    var $this = $(nnn)
                    if ($this.attr('data-field') == nn) {
                        $this.data().xmsFormular = n;
                        $this.attr('data-formular-event', 'true');
                        $this.attr('data-formular-ruler', ruler);
                    }
                });
            });
        });
    }
    xmsDataGrid.prototype.bindEvent = function (){
        this.headerBindFilter();
        this.headerBindresize();
        this.gridBindScroll();
        
        this.bodyBindEdit();
    }
    xmsDataGrid.prototype.render = function () {
        this.opts.preRender && this.opts.preRender(this);
        this.renderHeader();
        this.renderBody();
        this.renderFooter();
        this.renderTools();
        this.opts.Rendered && this.opts.Rendered(this);
        this.bindEvent();
        this.setHeight(this.opts.defaultHeight);
        this.fixHeaderWidth();//需要在设置高度以后加载

        this.createBtnTools();

        this.bindFormularEvent();
    }
    xmsDataGrid.prototype.renderFooter = function () { }
    xmsDataGrid.prototype.renderBody = function () {
        var self = this;
        var datas = this.datas.localdata;
        var columns = this.opts.columns;
        var htmls = [], ths = [];
        var primarykey = this.opts.primarykey;
        var __keyname = primarykey ? primarykey : 'id';
        htmls.push('<table class="table table-border xui-grid-table" >');
        htmls.push('<tbody>');
        var trshtml = this._addRowHtml(datas.length,datas);
        htmls.push(trshtml);
        htmls.push('</tbody>');
        htmls.push('</table>');
        this.$gridtbody.html(htmls.join(''));
    }
    xmsDataGrid.prototype.renderTools = function () { }
    xmsDataGrid.prototype.renderHeader = function () {
        var columns = this.opts.columns;
        var htmls = [],ths=[];
        var maxW = 0;
        
        for (var i = 0, len = columns.length; i < len; i++) {
            var item = columns[i];
            if (!item.width) { item.width = 100; };
            maxW += item.width;
            var _w = item.width ? ' width:' + item.width + 'px;' : '', _align = item.cellsalign ? ' text-align:' + item.cellsalign : '';
            ths.push('<th class="xui-grid-header-cells " style="' + _w + _align + '" data-field="' + item.datafield + '"><span class="xui-grid-header-cell-label">' + item.text + '</span></th>');
        }
        this.defaultRowWidth = maxW;
        var _width = maxW > this.gridWidth ? maxW : this.gridWidth;
        htmls.push('<table class="table table-border xui-grid-table" style="width:' + _width+'px;">');
        htmls.push('<thead>');
        htmls.push('<tr class="xui-grid-header-row" id="">');
        htmls.push(ths.join(''));
        htmls.push('</tr>');
        htmls.push('</thead>');
        htmls.push('</table>');
        this.$gridtheader.html(htmls.join(''));
    }
    xmsDataGrid.prototype.getData = function () {
        var self = this;

        if (self.apaxData.filterData) {
            self.apaxData.filterData(function (datas) {
                self.datas = datas;
                self._oldSource = self.datas;
                self.render();
            });
        } else {
            self.datas = this.apaxData.source;
            self._oldSource = self.datas;
            self.render();
        }
    }
    
    $.fn.xmsDataGrid = function (opts,_config,_more) {
        if (!(typeof opts == 'string')) {
            opts = $.extend({}, defaults, opts);
            this.each(function () {
                var $this = $(this);
                var _box = new xmsDataGrid(this, opts);
               // console.log(_box)
                $this.data().xmsDataGrid = _box;
            });
        } else {
            var res = null;
            this.each(function () {
                var $this = $(this);
                if ($this.data().xmsDataGrid) {
                    if (!$this.data().xmsDataGrid[opts]) throw new Error('没有这个方法');
                    res = $this.data().xmsDataGrid[opts](_config, _more);
                    return false;
                }
            });
            return res;
        }
    }

    //按钮组件
    xui.class('xui.xuiBtn', {
        constructor: function (opts) {
            /*
             *@target 可以指定某个DOm元素为按钮组件
             *@context 需要添加按钮的容器
             *@
             *@isRender 为true时 必须有context来添加该按钮，为false时，可以在后续添加$btn
             * @_super 可以为添加该按钮的对象，可以访问改对象的方法
             */
            $.extend(this, {
                'target': null,'context':null, 'type': 'button', 'event': 'click', 'handler': function (grid, e) {
                },isRender:true, name: 'create', 'text': '按钮', 'position': 'none', 'float': 'none','color':'btn-primary','_super':null
            }, opts);
            this.isAppend = false;
            this.$btn = null;

            this.init();
        },
        
        init: function () {
            this.render();
            this.bindEvent();
        },
        render: function () {
            this.$btn = $('<a class="btn btn-sm ' + this.color + '" data-name="' + this.name + '">' + this.text + '</a>');
            if (this.context && this.isRender) {
                this.context.append(this.$btn);
                this.isAppend = true;
            }
        },
        remove: function () {
            this.isAppend = false;
            this.$btn.remove();
        },
        bindEvent: function () {
            var self = this;
            var eventtype = this.event, eventHandler = this.handler, _super = this._super;
            this.$btn.on(eventtype, function (e) {
                eventHandler.call(this, _super, e);
            });
        }
        
    });


    /*
     * glo_开头的方法用于在创建新的类的时候自定义的方法，其他基本都是父类方法
     */
    xui.class('xui.xuiEditor',{
        constructor: xuiEditor,
        getCurrentData: function () {
            //console.log(this.datalist);
            return this.datalist[this.datalist.length - 1];
        },
        init : function () {
            this.initEdit();
            this.glo_init && this.glo_init(this.$input, this.$box, this.getCurrentData(), this);
            this._bindEvent();
        },
        _render : function () {
            this.$box.empty();
            this.$input.val(this.getCurrentData());
            this.$box.append(this.$input);
            this.glo_render && this.glo_render(this.$input, this.$box, this.getCurrentData(), this);
        },
        editStart : function () {
            this.preEdit(this.$input, this.$box, this.getCurrentData(), this);
            this.glo_preEdit && this.glo_preEdit(this.$input, this.$box, this.getCurrentData(), this);
            this._render();
            this.rendered(this.$input, this.$box, this.getCurrentData(), this);
            this.glo_rendered && this.glo_rendered(this.$input, this.$box, this.getCurrentData(), this);
        },
        editEnd: function (that) {
            var self = this;
            
            var val = self.$input.val();
            
            self.edited(self.$input, self.$box, self.getCurrentData(), self);
            this.glo_edited && this.glo_edited(this.$input, this.$box, this.getCurrentData(), this);
            self.datalist.push(val);
            self.editState = 2;
            //console.log('end',self.editState);
            that && $(that).off();
            self.remove();
            self.$box.html(val);
        },
        remove: function () {
            this.$input.off();
            this.$input.remove();
        },
        toEdit: function () {
            var self = this;
            self.$input.on('xuievent.xui-grid-editblur', function () {
                var that = this;
                var flag = self.validation();
                if (flag.result == true) {
                  //  console.log(flag);
                    self.editEnd(that);
                } else if (flag.result == false) {
                  //  console.log(flag);
                    self.editState = 2;
                    //{ result: false, message: "Ship Date should be before 1/1/2013" }
                }
            });

            if (self.editState == 1) return true;
            self.editStart();
            self.editState = 1;
            //self.$input.focus();
        },
        bindEvent: function () {

        },
        _bindEvent : function () {
            var self = this;
            self.$box.on('xuievent.xui-grid-edit', function (e) {
                self.toEdit(this,e);
            });
            self.$input.on('keyup.xui-grid-edit', function (e) {
                self.onchange($(this), self.$box, e);
                self.glo_onchange && self.glo_onchange($(this), self.$box, e);
            });
            self.bindEvent();
        }
    });

    //编辑
    function xuiEditor(obj, opts) {
        this.name = name;
        this.$box = $(obj);
        this.editState = 0;//0未编辑，1正在编辑，2已编辑过
        this.$input = $('<input type="text" class="form-control xui-editor-input" value="" />');
        this.datalist = [];
        this.handleData = [];
        this.defaultData = opts&&(opts.getDefaultData && opts.getDefaultData(this.$box)) || this.$box.html();
        this.datalist.push(this.defaultData);
        this.initEdit = opts.initEdit || function () { };
        this.preEdit = opts.preEdit || function () { }//进入编辑之前
        this.rendered = opts.rendered || function () { }//进入编辑后
        this.edited = opts.edited || function () { }//编辑完成后
        this.validation = opts.validation || function () { return { result: true, message: "" } }//编辑完成后
        if (opts.onchange) {
            this.onchange = opts.onchange || function () { };
        }
        
        this.init();
    }
    
    $.fn.xuiEditor = function (opts, _config, _more) {
        if (!(typeof opts == 'string')) {
            opts = $.extend({}, defaults, opts);
            this.each(function () {
                var $this = $(this);
                var _box = new xui.xuiEditor(this, opts);
               // console.log(_box)
                $this.data().xuiEditor = _box;
            });
        } else {
            var res = null;
            this.each(function () {
                var $this = $(this);
                if ($this.data().xuiEditor) {
                    if (!$this.data().xuiEditor[opts]) throw new Error('没有这个方法');
                    res = $this.data().xuiEditor[opts](_config, _more);
                    return false;
                }
            });
            return res;
        }
    }

    /*
     *@param 新增编辑类型工厂
     */
    function ColumnEditor(name, opts) {
        var _obj = $.extend({}, {
            constructor: opts.constructor,
            extends: xui.xuiEditor
        },opts);
        return xui.class('xui.' + name, _obj )
        //this.name = name;
        //this.element = $('<input type="text" class="form-control" value="" />');
        //this.form = null;
        //this.datalist = [];
        //this.preEdit = opts.preEdit || function () { }//进入编辑之前
        ////this.rendered = opts.rendered || function () { }//进入编辑后
        //this.edited = opts.edited || function () { }//编辑完成后
    }
    var ColumnEdits = new function () {
        this.edits = [];
        this.datalist = [];
        this.add = function (name, opts) {
            this.edits.push(ColumnEditor(name, opts));
        }
        this.find = function (name) {
            return xui[name];
        }
    }
    

    //用于外部添加进来
    $.fn.xmsDataGrid.addColumnEditType = function (name, opts) {
        ColumnEdits.add(name, opts);
    }
    /*默认编辑方式*/
    $.fn.xmsDataGrid.addColumnEditType('defaultText', 
        {
            glo_rendered: function ($input, $box, e) {
                var isFormular = $box.attr('data-formular-event');
                var formular = $box.data().xmsFormular;
                if (isFormular) {
                    var ruler = formular.ruler, $tr = $box.parents('tr:first');
                    var rightRuler = ruler[ruler.length - 1];//等式右边的字段名
                    var $rightRdom = $tr.find('td[data-field="' + rightRuler.toLowerCase() + '"]  input.xui-editor-input');
                    if ($rightRdom.length > 0) {
                        $rightRdom.prop('readonly', true);
                    }
                }
            },
            onchange: function ($input, $box, e) {//解析行计算
                var isFormular = $box.attr('data-formular-event');
                var formular = $box.data().xmsFormular;
                if (isFormular) {
                    var ruler = formular.ruler, $tr = $box.parents('tr:first');
                    var keys = formular.eventKeys;
                    var values = [];
                    var _res = ruler;
                    var itemRuler = ruler.join('');
                    var tempArr = itemRuler.split('=');
                    var isLeft = false;
                    var leftArr = getLeftFormular(ruler, isLeft);//获取等号左边的等式
                    var rightRuler = ruler[ruler.length - 1];//等式右边的字段名
                    var $rightRdom = $tr.find('td[data-field="' + rightRuler.toLowerCase() + '"]  input.xui-editor-input');
                    if ($rightRdom.length > 0) {
                        $rightRdom.prop('readonly', true);
                    }
                    getFormularResult(leftArr, tempArr[0], rightRuler, $tr);//处理等式

                }

            }
        });

    /*默认编辑方式*/
    $.fn.xmsDataGrid.addColumnEditType('picklist', {

    });

    
    
    //KoDataApax 数据处理组件 还未完成——————————————————————————————
    /*
     *@param source:{datatype:'array',localdata:[]}
     */
    function KoDataApax(source, opts) {
        this.source = source;
        this.opts = opts;
        this.datas = [];
        this.oldrecords = [];
        this.records = [];
        this.filter = null;
        this.recordsCount = 0;
    }

    $.XmsUI.DataApax = function (source,opts) {
        return new KoDataApax(source, opts);
    }
})(jQuery, window);

