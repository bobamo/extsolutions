function Generator(params) {
    this.params = params;
}

Generator.prototype.getType = function() {
    return 'schema';
};

Generator.prototype.run = function(schema, file, errors) {
    this.schema = schema;
    this.file = file;
    this.errors = errors;

    var schemaName = schema.get('name');

    file.set('name', schemaName + '.js');

    file.writeln("var mongoose = require('mongoose')");
    file.writeln("   ,Schema = mongoose.Schema;");

    this.generateRequires();

    file.writeln("");
    file.writeln("exports." + schemaName + " = new Schema({ ");
    file.indent++;

    this.generateFields();

    file.indent--;
    file.writeln("});");

    file.writeln("exports." + schemaName + ".plugin(commonPlugin);");
};

Generator.prototype.generateRequires = function() {
    var requiredSchemas = this.schema.GetRequiredSchemas(true);
    for (var i = 0; i < requiredSchemas.length; i++) {
        var requiredSchema = requiredSchemas[i];
        if (requiredSchema !== this.schema){
            var name = requiredSchema.get('name');
            this.file.writeln("var " + name + " = require('../schemas/" + name +".js')." + name + ";");
        }
    }
};

Generator.prototype.generateFields = function() {
    if (this.schema['hasMany_properties'] == null) return;

    this.file.indent++;

    this.file.isFirstComma = true;
    var properties = this.schema.getAllProperties();
    for (var i = 0; i < properties.length; i++) {
        var prop = properties.getAt(i);
        switch(prop.$className)
        {
            case 'designer.model.PPStringProperty': this.generateStringProperty(prop); break;
            case 'designer.model.PPBooleanProperty': this.generateBooleanProperty(prop); break;
            case 'designer.model.PPDateProperty': this.generateDateProperty(prop); break;
            case 'designer.model.PPIntProperty': this.generateIntProperty(prop); break;
            case 'designer.model.PPAutoProperty': this.generateAutoProperty(prop); break;
            case 'designer.model.PPReferenceProperty': this.generateReferenceProperty(prop); break;
            case 'designer.model.PPObjectProperty': this.generateObjectProperty(prop); break;
            case 'designer.model.PPObjectIdProperty': this.generateObjectIdProperty(prop); break;
            default: this.errors.push("unsupported property: " + prop.$className + ": " + prop.get('name') + " \n");
        }
    }

    this.file.indent--;
};

Generator.prototype.generateStringProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = (rp.defaultValue != '') ? ", default: '" + rp.defaultValue + "'" : "";

    this.file.writeln(this.file.comma() + rp.name + ": { type: String" + strDV + " }");
};

Generator.prototype.generateBooleanProperty = function (prop) {
    var rp = prop.getRealProperties(),
        strDV = (rp.defaultValue) ? ", default: true" : "";

    this.file.writeln(this.file.comma() + rp.name + ": { type: Boolean" + strDV + " }");
};

Generator.prototype.generateDateProperty = function (prop) {
    var rp = prop.getRealProperties(),
        strDV = "";

    if (rp.defaultValue != null) {
        strDV = ", default: '" + rp.defaultValue + "'";
    } else {
        if (!rp.isNullable) strDV = ", default: new Date(0)";
    }

    this.file.writeln(this.file.comma() + rp.name + ": { type: Date" + strDV + " }");
};

Generator.prototype.generateIntProperty = function (prop) {
    var rp = prop.getRealProperties(),
        strDV = (rp.defaultValue != 0) ? ", default: '" + rp.defaultValue + "'" : "";

    this.file.writeln(this.file.comma() + rp.name + ": { type: Number" + strDV + " }");
};

Generator.prototype.generateAutoProperty = function (prop) {
    var rp = prop.getRealProperties(),
        strDV = "";

    this.file.writeln(this.file.comma() + rp.name + ": { type: mongoose.Schema.Types.Mixed" + strDV + " }");
};

Generator.prototype.generateReferenceProperty = function (prop) {
    var name = prop.getFieldName(),
        type_id = prop.get('type_id'),
        refSchema = viewport.designer.dsSchemas.getNodeById(type_id),
        refModel = refSchema.get('name');

    this.file.writeln(this.file.comma() + name + ": { type: String, ref: '" + refModel + "' }");
};

Generator.prototype.generateObjectProperty = function (prop) {
    var rp = prop.getRealProperties(),
        type_id = prop.get('type_id'),
        embeddedSchema = viewport.designer.dsSchemas.getNodeById(type_id),
        embeddedSchemaName = embeddedSchema.get('name');

    this.file.writeln(this.file.comma() + rp.name + ": [" + embeddedSchemaName + "]");
};

Generator.prototype.generateObjectIdProperty = function (prop) {
    var rp = prop.getRealProperties();

    this.file.writeln(this.file.comma() + rp.name + ": Schema.ObjectId");
};
