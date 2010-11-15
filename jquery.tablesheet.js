/*
* jQuery Tablesheet Widget 
*
* Copyright 2010, Alca Società Cooperativa
*
* Authors:
*  - Luca Greco <luca.greco AT alcacoop.it>
* 
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
*
*
* Depends:
* jquery.ui.core.js
* jquery.ui.widget.js
* jquery.tmpl.js
*/

(function( $, undefined ) {
    // Template blueprints
    var _bp = {
	table: $.template('<div class="tablesheet-container ui-state-default ui-corner-all" style="width: 600px; overflow: hidden;">'+
			  '<table class="" style="width: 98%; height: 98%;">'+
                          '<thead></thead><tbody></tbody><tfoot>{{tmpl footTemplate}}</tfoot></table></div>'),
	columns: $.template('<tr class="columns"> \
<td></td><td></td> \
{{each(i,col) columns}} \
{{tmpl({col: col, col_index: i}) colkeyTemplate}} \
{{/each}} \
<td class="add-col" style="width: 1%; border: 0px;"> \
<span class="ui-icon ui-icon-circle-plus"></span></td> \
</tr></thead>'),
	foot: $.template('<tr> \
<td></td> \
<td class="add-row" style="border: 0px;"> \
<span class="ui-icon ui-icon-circle-plus"> \
</span> \
</td> \
</tr>'),
	col_key: $.template('<td class="tablesheet-colkey ui-corner-all" style="border: 0px;">${$item.data.col}</td>'),
	row: $.template('<tr class="row"><td></td> \
{{tmpl() rowkeyTemplate}} \
{{each(i, cell) cells}} \
{{tmpl({cell: cell, i: i}) cellTemplate}} \
{{/each}} \
</tr>'), 
	row_key: $.template('<td class="tablesheet-rowkey ui-corner-all" style="border: 0px; width: 1%; padding-right: 5px;">${row_key}</td>'),
	cell: $.template('<td class="tablesheet-cell ui-corner-all ui-widget-content">{{html $item.data.cell}}</td>'),

	editor_dialog: $.template('<div style="display:none">\
<div id="tablesheet-editor-dialog"> \
<textarea></textarea> \
</div> \
</div>')
	
    };

    function array_swap(list, x, y) {
	var tmp = list[x];
	list[x] = list[y];
	list[y] = tmp;

	return list;
    }

    $.widget("ui.tablesheet", {
	options: {
	},	
	_create: function() {
	    var data = this.options.data;

	    var table = $.tmpl(_bp.table, {
		footTemplate: _bp.foot
	    });
	    var head = $.tmpl(_bp.columns, { 
		colkeyTemplate: _bp.col_key, 
		columns: data.columns
	    });

	    table.appendTo(this.element[0]);
	    head.appendTo("thead",table);

	    this.parts = {
		table: table,
		head: head,
	    }	  	 

	    var rows = this._renderRows();

	    this.parts.rows = rows
	},
	_editorDialog: function(editor_value, save_callback) {
	    var editor_dialog = $.tmpl(_bp.editor_dialog);
	    editor_dialog.dialog({
		title: "Editor",
		maxWidth: "800",		
		buttons: {
		    "Save": function() {
			save_callback($("textarea", this).wysiwyg("getContent"));
			$(this).dialog("close");
		    },
		    "Cancel": function() {
			$(this).dialog("close");
		    }
		},
		open: function () {
		    $(this).dialog( "option", "width", 460 );
		    $("textarea", this).css("width","95%").html(editor_value)
			.wysiwyg();
		    //$(".wysiwyg iframe", this).focus();
		},
		close: function() { 		    
		    $(this).dialog("destroy"); 
		    $(this).remove();
		},
		resize: function(event, ui) {
		    //console.dir(ui);
		    $(".wysiwyg", this).css("width", ui.size.width-50);
		    $(".wysiwyg", this).css("height", ui.size.height-148);
		}
	    }).css("overflow", "hidden");

	    //editor_dialog.dialog("widget").focus();
	},
	_renderRows: function() {
	    var data = this.options.data;
	    var table = this.parts.table;
	    var self = this;

	    $("tbody", table).empty();

	    var rows = $(data.rows).map(function (i,v) {
		var row = $.tmpl(_bp.row, {
		    rowkeyTemplate: _bp.row_key,
		    cellTemplate: _bp.cell,
		    row_key: v,
		    row_index: i,
		    cells: data.cells[i]
		});

		self._init_row_events(row);

		row.appendTo("tbody",table);
		return row;
	    });

	    return rows;
	},
	_init: function() {
	    var self = this;

	    this._init_head_events();

	    if(this.options.resizable) 
		$(self.parts.table).resizable({
		    stop: function(event, ui) {
			var table = $("table", this);
			var table_w = table.width();
			var table_h = table.height();

			if(ui.size.width < table_w) 
			    $(this).width(table_w);
			if(ui.size.height < table_h) {
			    $(this).height(table_h);
			}
		    }
		});

	    $("tfoot .add-row", self.parts.table).hover(
		function () {
		    $(this).addClass("ui-state-hover");
		}, function() {
		    $(this).removeClass("ui-state-hover");
		}).click(function() {
		    self.addRow("NewRow");
		});
	},
	_init_head_events: function() {
	    var self = this;

	    $("thead .add-col", self.parts.table).hover(
		function () {
		    $(this).addClass("ui-state-hover");
		}, function() {
		    $(this).removeClass("ui-state-hover");
		}).click(function() {
		    self.addColumn("NewCol");
		});

	    $("td.tablesheet-colkey", self.parts.table).each(function(i,v) {
		self._init_colkey_events(v);
	    });
	},
	_init_row_events: function(row) {
	    var self = this;
	    $("td.tablesheet-rowkey",row).each(function(i,v) {
		self._init_rowkey_events(v);
	    });
	    $("td.tablesheet-cell",row).each(function(i,v) {
		self._init_cell_events(v);
	    });
	},
	_init_rowkey_events: function(cell) {
	    var data = this.options.data;
	    var self = this;


	    $(cell).hover(
		function () {
		    $(this).addClass("ui-state-hover");
		}, function() {
		    $(this).removeClass("ui-state-hover");
		}).dblclick(function() {
		    self._edit_rowkey(this);
		}).draggable({ 
		    helper: 'clone',
		    cursorAt: { left: 10, top: 10 }
		}).droppable({
		    accept: '.tablesheet-rowkey',
		    activate: function() {
			$(this).addClass("ui-state-highlight");
		    },
		    deactivate: function() {
			$(this).removeClass("ui-state-highlight");
		    },
		    drop: function(event, ui) {
			var drop_on = $(this).tmplItem();
			var drag_from = ui.draggable.tmplItem();

			$(ui.draggable).remove();
			self.swapRows(drop_on.data.row_index, drag_from.data.row_index);
		    }
		});	    
	},
	_edit_rowkey: function(keycell) {
	    var data = this.options.data;
	    var self = this;
	    var tmplItem = $(keycell).tmplItem();
	    var row_index = tmplItem.data.row_index;
	    var row_key = tmplItem.data.row_key;

	    var saveCallback = function(new_value) {
		data.rows[row_index] = new_value;
		
		tmplItem.data.row_key = new_value;
		tmplItem.update();
			
		self._init_rowkey_events(tmplItem.nodes[0]);		
	    }

	    var initialValue = row_key;

	    this._edit_keycell(keycell, initialValue, saveCallback);
	},
	_edit_colkey: function(keycell) {
	    var data = this.options.data;
	    var self = this;
	    var tmplItem = $(keycell).tmplItem();
	    var col_index = tmplItem.data.col_index;

	    var saveCallback = function(new_value) {
		data.columns[col_index] = new_value;
		
		tmplItem.data.col = new_value;
		tmplItem.update();
			
		self._init_colkey_events(tmplItem.nodes[0]);		
	    }

	    var initialValue = tmplItem.data.col;

	    this._edit_keycell(keycell, initialValue, saveCallback);
	},
	_edit_keycell: function(keycell,initialValue, saveCallback) {
	    var self = this;
	    var old_content = $(keycell).html();
	    $(keycell).empty();
	    var editor = $("<input type='text' style='width: 99%;'/>");
	    $(editor).val(initialValue).appendTo(keycell).
		focus(function() { $(this).select(); }).focus().
		keyup(function(e) {
		    // ENTER
		    if(e.keyCode == 13) {
			var new_value = $(editor).val();
			saveCallback(new_value);
		    }
		    // ESC
		    if(e.keyCode == 27) {
			$(keycell).empty();
			$(keycell).append(old_content);
		    }
		}).focusout(function() {
		    $(keycell).empty();
		    $(keycell).append(old_content);
		});
	},
	_init_colkey_events: function(cell) {
	    var self = this;

	    $(cell).hover(
		function () {
		    $(this).addClass("ui-state-hover");
		}, function() {
		    $(this).removeClass("ui-state-hover");
		}).dblclick(function() {
		    self._edit_colkey(this);
		}).draggable({ 
		    helper: 'clone',
		    cursorAt: { left: 10, top: 10 }
		}).droppable({
		    accept: '.tablesheet-colkey',
		    activate: function() {
			$(this).addClass("ui-state-highlight");
		    },
		    deactivate: function() {
			$(this).removeClass("ui-state-highlight");
		    },
		    drop: function(event, ui) {
			var drop_on = $(this).tmplItem();
			var drag_from = ui.draggable.tmplItem();

			$(ui.draggable).remove();
			self.swapColumns(drop_on.data.col_index, drag_from.data.col_index);
		    }
		});	     
	},
	_update_cell: function(cell, value) {
	    var data = this.options.data;
	    var tmplItem = $(cell).tmplItem();
	    var col_index = tmplItem.data.i;
	    var row_index = tmplItem.parent.data.row_index;

	    data.cells[row_index][col_index] = value;
	    
	    tmplItem.data.cell = value;	
	    tmplItem.update();

	    this._init_cell_events(tmplItem.nodes[0]);	    
	},
	_init_cell_events: function(cell) {
	    var data = this.options.data;
	    var self = this;

	    $(cell).hover(
		function () {
		    $(this).addClass("ui-state-hover");
		}, function() {
		    $(this).removeClass("ui-state-hover");
		}).dblclick(function() {
		    var cell = this;
		    var tmplItem = $(cell).tmplItem();
		    var value = tmplItem.data.cell;
		    var saveCallback = function (new_value) {
			self._update_cell(cell, new_value);
		    };

		    self._editorDialog(value, saveCallback);
		}).draggable({ 
		    helper: 'clone',
		    cursorAt: { left: 10, top: 10 }
		}).droppable({
		    accept: '.tablesheet-cell',
		    activate: function() {
			$(this).addClass("ui-state-highlight");
		    },
		    deactivate: function() {
			$(this).removeClass("ui-state-highlight");
		    },
		    drop: function(event, ui) {
			var drop_on = $(this).tmplItem();
			var drag_from = ui.draggable.tmplItem();

			var drop_on_data = {
			    row_index: drop_on.parent.data.row_index,
			    col_index: drop_on.data.i,
			    value: drop_on.data.cell
			};

			var drag_from_data = {
			    row_index: drag_from.parent.data.row_index,
			    col_index: drag_from.data.i,
			    value: drag_from.data.cell
			};

			drop_on.data.cell = drag_from_data.value;
			drag_from.data.cell = drop_on_data.value;
			self.options.data.
			    cells[drop_on_data.row_index][drop_on_data.col_index] =
			    drag_from_data.value;
			self.options.data.
			    cells[drag_from_data.row_index][drag_from_data.col_index] =
			    drop_on_data.value;

			self.update();

			$(ui.draggable).remove();
		    }
		});
	},
	data: function() {
	    return this.options.data;
	},
	addRow: function(key, values) {
	    var data = this.options.data;
	    var cells = values;

	    if(cells && (data.columns.length !== values.length))
		throw("ERROR: addRow needs "+data.columns.length+" values!!!");

	    if(!cells) {
		cells = $(data.columns).map(function () { return " "; });
	    }

	    data.rows.push(key);
	    data.cells.push(cells);

	    var row = $.tmpl(_bp.row, {
		rowkeyTemplate: _bp.row_key,
		cellTemplate: _bp.cell,
		row_index: data.rows.length-1,
		row_key: key,
		cells: cells		
	    });
	    row.appendTo("tbody", this.parts.table);
	    this._init_row_events(row);
	},
	addColumn: function(key, values) {
	    var data = this.options.data;
	    var cells = values
	    var self = this;

	    if(cells && (data.rows.length !== cells.length))
		throw("ERROR: addColumn needs "+data.rows.length+" values!!!");

	    if(!cells) {
		cells = $(data.rows).map(function () { return " "; });
	    }

	    var head = $("thead tr").tmplItem();
	    var rows = $("tbody tr");

	    data.columns.push(key);
	    head.update();
	    this._init_head_events();
	    
	    $(cells).each(function(i,v) {
		var tmplItem = $(rows[i]).tmplItem();
		data.cells[i].push(cells[i]);
		tmplItem.update();
		self._init_row_events(tmplItem.nodes[0]);
	    });
	},
	swapColumns: function(src_index,dst_index) {
	    var data = this.options.data;

	    if(data.columns.length <= src_index || data.columns.length <= dst_index) 
		throw("ERROR: src_index and dst_index max value is "+(data.columns.length-1)+"!!!");

	    array_swap(data.columns, src_index, dst_index);

	    $(data.cells).each(function (i,v) {
		array_swap(v, src_index, dst_index);
	    });

	    this.update();	    
	    this._init_head_events();
	},
	swapRows: function(src_index, dst_index) {
	    var data = this.options.data;

	    if(data.rows.length <= src_index || data.rows.length <= dst_index) 
		throw("ERROR: src_index and dst_index max value is "+(data.rows.length-1)+"!!!");

	    array_swap(data.rows, src_index, dst_index);
	    array_swap(data.cells, src_index, dst_index);

	    this._renderRows();
	},
	update: function() {
	    var table = this.parts.table;
	    var head = $("thead tr").tmplItem();
	    head.update();
	    this._init_head_events();
	    this._renderRows();
	},
	serialize: function() {
	    return JSON.stringify(this.options.data);
	},
	load: function(value) {
	    var json;

	    switch(typeof value) {
	    case "string":
		json = JSON.parse(value);
		break;
	    case "object":
		json = value;
		break;
	    default:
		throw("ERROR: value should be string or a json object");
	    }

	    this.options.data = json;
	    this.parts.table.remove();
	    this._create();
	    this._init();
	}
    });
})(jQuery);

