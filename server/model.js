const {pool, query} = require('./database');
const {config_pg} = require('./config');
// mercator
const SphericalMercator = require('@mapbox/sphericalmercator');
const mercator = new SphericalMercator({size: 256});

if (process.env.NODE_ENV !== "production") {
    // configure dotenv
    require("dotenv").config();

}

async function columnNames(table) {

    return query('SELECT array_to_string(ARRAY(SELECT c.column_name FROM information_schema.columns As c WHERE table_name = $1 AND  c.column_name NOT IN(\'geom\', \'geom_3857\') ), \', \') as column', [table]);
}

async function pgTiles(table, z, x, y) {
    const result_name = await columnNames(table);
    const bbox = mercator.bbox(x, y, z, false);
    // const q = `SELECT ST_AsMVT(q, '${table}', 4096, 'geom') FROM (
    //         SELECT ST_AsMVTGeom(ST_Transform(geom_3857, 3857),
    //         ST_Transform(ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326), 3857), 4096, 256, true) geom, ${column_name} FROM ${table}
    //         WHERE ST_Intersects(ST_Transform(geom_3857, 3857), ST_Transform(ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326), 3857))
    //     ) q`;
    const q = `SELECT ST_AsMVT(q, '${table}', 4096, 'geom') FROM (SELECT ST_AsMVTGeom(geom_3857, ST_Transform(ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326), 3857), 4096, 256, true) geom, 
     ${result_name[0].column} FROM ${table} WHERE ST_Intersects(geom_3857, ST_Transform(ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}, 4326), 3857))) q`;

    let data = await query(q);

    return data[0]['st_asmvt'];
}

async function getCountryBBOX(iso3) {

    const q = 'select st_xmax(geom), st_ymax(geom), st_xmin(geom), st_ymin(geom) from (select st_transform(geom, 4326) as geom from ifad_gaul_level_0_2019 WHERE iso3_code=$1) as g';

    return query(q, [iso3]);
}


async function getRandomPoints(grips_id) {
    const q = "SELECT jsonb_build_object('type', 'FeatureCollection', 'features', jsonb_agg(ST_AsGeoJSON(geom)::jsonb))" +
        "FROM (SELECT (ST_DUMP(ST_GeneratePoints(geom, 50))).geom FROM haram where name=$1) AS b";
    return query(q, [grips_id])
}

module.exports = {pgTiles, getCountryBBOX, getRandomPoints};
