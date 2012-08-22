function Generator(params) {
    this.params = params;
    this.params.namespace = this.params.namespace || '';
}

Generator.prototype.getType = function() {
    return 'schema';
};

Generator.prototype.getRequiredCustomProperties = function() {
    var result = [];
    result.push({ frameworkItem: 'All Properties', name: 'isPersistent', type: 'Boolean', defaultValue: true });
    return result;
};

Generator.prototype.run = function(schema, file, errors) {
    this.schema = schema;
    this.file = file;
    this.errors = errors;

    var schemaName = schema.get('name'),
        parentSchemaName = "Ext.data.Model";

    if (schema.parentNode != null) {
        parentSchemaName = this.params.namespace + schema.parentNode.get('name');
    }

    file.set('name', schemaName + '.js');

    file.writeln("Ext.define('" + this.params.namespace + schemaName + "', { ");
    file.indent++;

    file.writeln("extend: '" + parentSchemaName + "',");
    file.writeln("alias: '" + schemaName + "'");
    file.writeln("");

    this.generateFields();
    this.generateAssociations();
    this.generateValidations();

    file.indent--;
    file.writeln("});");
};

Generator.prototype.generateFields = function() {
    if (this.schema['hasMany_properties'] == null) return;

    this.file.writeln(",fields: [");
    this.file.indent++;

    this.file.isFirstComma = true;
    for (var i = 0; i < this.schema['hasMany_properties'].count(); i++) {
        var prop = this.schema['hasMany_properties'].getAt(i);
        switch(prop.$className)
        {
            case 'designer.model.PPStringProperty': this.generateStringProperty(prop); break;
            case 'designer.model.PPBooleanProperty': this.generateBooleanProperty(prop); break;
            case 'designer.model.PPDateProperty': this.generateDateProperty(prop); break;
            case 'designer.model.PPIntProperty': this.generateIntProperty(prop); break;
            case 'designer.model.PPAutoProperty': this.generateAutoProperty(prop); break;
            case 'designer.model.PPReferenceProperty': this.generateReferenceProperty(prop); break;
            case 'designer.model.PPObjectProperty': break;
            case 'designer.model.PPObjectIdProperty': this.generateObjectIdProperty(prop); break;
            default: this.errors.push("unsupported property: " + prop.$className + ": " + prop.get('name') + " \n");
        }
    }

    this.file.indent--;
    this.file.writeln("]");
};

Generator.prototype.generateStringProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = (rp.defaultValue != '') ? ", defaultValue: '" + rp.defaultValue + "'" : "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";

    this.file.writeln(this.file.comma() + "{ name: '" + rp.name + "', type: 'string'" + strDV + strPersistent + " }");
};

Generator.prototype.generateBooleanProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = (rp.defaultValue) ? ", defaultValue: true" : "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";

    this.file.writeln(this.file.comma() + "{ name: '" + rp.name + "', type: 'boolean'" + strDV + strPersistent + " }");
};

Generator.prototype.generateDateProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";

    if (rp.defaultValue != null) {
        strDV = ", defaultValue: '" + rp.defaultValue + "'";
    } else {
        if (!rp.isNullable) strDV = ", defaultValue: new Date(0)";
    }

    this.file.writeln(this.file.comma() + "{ name: '" + rp.name + "', type: 'date'" + strDV + strPersistent + " }");
};

Generator.prototype.generateIntProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = (rp.defaultValue != 0) ? ", defaultValue: '" + rp.defaultValue + "'" : "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";

    this.file.writeln(this.file.comma() + "{ name: '" + rp.name + "', type: 'int'" + strDV + strPersistent + " }");
};

Generator.prototype.generateAutoProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";

    this.file.writeln(this.file.comma() + "{ name: '" + rp.name + "', type: 'auto'" + strDV + strPersistent + " }");
};

Generator.prototype.generateReferenceProperty = function(prop) {
    var rp = prop.getRealProperties(),
        name = prop.getFieldName(),
        strDV = "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";


    this.file.writeln(this.file.comma() + "{ name: '" + name + "', type: 'string'" + strDV + strPersistent + " }");
};

Generator.prototype.generateObjectIdProperty = function(prop) {
    var rp = prop.getRealProperties(),
        strDV = "",
        strPersistent = (!rp.isPersistent) ? ", persist: false" : "";

    this.file.writeln(this.file.comma() + "{ name: '" + rp.name + "', type: 'auto'" + strDV + strPersistent + " }");
};

Generator.prototype.generateAssociations = function() {
    if (this.schema['hasMany_properties'] == null) return;

    this.file.writeln(",associations: [");
    this.file.indent++;

    this.file.isFirstComma = true;
    for (var i = 0; i < this.schema['hasMany_properties'].count(); i++) {
        var prop = this.schema['hasMany_properties'].getAt(i);
        if (prop.$className == 'designer.model.PPObjectProperty') {
            if (prop.get('isArray')) {
                this.generateHasManyAssociation(prop);
            } else {
                this.generateBelongsToAssociation(prop);
            }
        }
    }

    this.file.indent--;
    this.file.writeln("]");
};

Generator.prototype.generateHasManyAssociation = function(prop) {
    var name = prop.get('name'),
        type_id = prop.get('type_id'),
        model = viewport.designer.dsSchemas.getNodeById(type_id),
        modelName = model.get('name');

    this.file.writeln(this.file.comma() + "{ type: 'hasMany', name: '" + name + "', associationKey: '" + name + "', model: '" + this.params.namespace + modelName + "' , primaryKey: '_id' }");
};

Generator.prototype.generateBelongsToAssociation = function(prop) {
    var name = prop.get('name'),
        type_id = prop.get('type_id'),
        model = viewport.designer.dsSchemas.getNodeById(type_id),
        modelName = model.get('name');

    this.file.writeln(this.file.comma() + "{ type: 'belongsTo', name: '" + name + "', model: '" + this.params.namespace + modelName + "' }");
};

Generator.prototype.generateValidations = function() {
    if (this.schema['hasMany_properties'] == null) return;

    this.file.writeln(",validations: [");
    this.file.indent++;

    this.file.isFirstComma = true;
    for (var i = 0; i < this.schema['hasMany_properties'].count(); i++) {
        var prop = this.schema['hasMany_properties'].getAt(i),
            name = prop.getFieldName(),
            isNullable = prop.get('isNullable'),
            minLength = prop.get('minLength') || 0,
            maxLength = prop.get('maxLength') || 0,
            vFormat = prop.get('vFormat') || '';


        if (!isNullable) {
            this.file.writeln(this.file.comma() + "{ field: '" + name + "', type: 'presence' }");
        }
        if ((minLength > 0) || (maxLength > 0)) {
            this.file.writeln(this.file.comma() + "{ field: '" + name + "', type: 'length', min: " + minLength + ", max: " + maxLength + " }");
        }
        if (vFormat.length > 0) {
            if (vFormat == 'email') {
                this.file.writeln(this.file.comma() + "{ field: '" + name + "', type: 'email' }");
            } else {
                this.file.writeln(this.file.comma() + "{ field: '" + name + "', type: 'format', matcher: " + vFormat + " }");
            }
        }
    }

    this.file.indent--;
    this.file.writeln("]");
};

