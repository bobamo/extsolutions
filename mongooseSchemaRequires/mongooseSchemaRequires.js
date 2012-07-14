function Generator(params) {
    this.params = params;
    this.schemasInRightOrder = [];
}

Generator.prototype.getType = function() {
    return 'schemalist';
};

Generator.prototype.run = function(schemas, file, errors) {
    this.schemas = schemas;
    this.file = file;
    this.errors = errors;

    file.set('name', 'mongooseSchemaRequires.js');

    if (this.params.filter) {
        this.schemas = Ext.Array.filter(this.schemas, function(schema) {
            for (var i = 0; this.params.filter.length > i; i++) {
                var filter = this.params.filter[i];
                var value = schema.get(filter.property);
                if (value != filter.value) return false;
            }
            return true;
        }, this);
    }

    while (this.schemas.length > 0) {
        this.sortFunction_req(this.schemas[0]);
    }

    file.writeln("var mongoose = require('mongoose');");
    file.writeln("");

    this.generateExports();
    this.generateModels();
};

Generator.prototype.generateExports = function() {
    for (var i = 0; i < this.schemasInRightOrder.length; i++) {
        var schema = this.schemasInRightOrder[i],
            name = schema.get('name');
        this.file.writeln("exports." + name + " = require('../schemas/" + name + "')." + name + ";");
    }
};

Generator.prototype.generateModels = function() {
    this.file.writeln("exports.Models = [");
    this.file.indent++;

    this.file.isFirstComma = true;
    for (var i = 0; i < this.schemasInRightOrder.length; i++) {
        var schema = this.schemasInRightOrder[i],
            name = schema.get('name'),
            collectionName = schema.getCollectionName();

        if (collectionName) {
            this.file.writeln(this.file.comma() + "{name: '" + name + "', schema: exports." + name + ", collection: '" + collectionName + "'}");
        }
    }
    this.file.indent--;
    this.file.writeln("];");
};

Generator.prototype.sortFunction_req = function(schema) {
    if (!Ext.Array.contains(this.schemas, schema)) return;

    this.sortFunction_req(schema.parentNode);

    var requiredSchemas = schema.GetRequiredSchemas(true);
    for (var i = 0; i < requiredSchemas.length; i++) {
        var requiredSchema = requiredSchemas[i];
        if (requiredSchema !== schema){
            this.sortFunction_req(requiredSchema);
        }
    }

    Ext.Array.include(this.schemasInRightOrder, schema);
    Ext.Array.remove(this.schemas, schema);
};
