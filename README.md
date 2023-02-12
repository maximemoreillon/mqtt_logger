# MQTT Logger

[<img src="https://img.shields.io/docker/pulls/moreillon/mqtt-logger?logo=docker">](https://hub.docker.com/repository/docker/moreillon/mqtt-logger)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/mqtt-logger)](https://artifacthub.io/packages/search?repo=mqtt-logger)

Stores data sent over MQTT into an InfluxDB time series database.

An article about this project is available [here](https://articles.maximemoreillon.com/articles/5aa92bbf-956c-43a9-8f3c-e0bdacd6412d)

## API

| Endpoint                   | Method | query/body | Description                                          |
| -------------------------- | ------ | ---------- | ---------------------------------------------------- |
| /sources                   | GET    | -          | Returns list of sources                              |
| /sources                   | POST   | name       | Create a new source                                  |
| /sources/:source_id        | GET    | -          | Returns the source identified by ID :source_id       |
| /sources/:source_id        | PATCH  | -          | Updates the source identified by ID :source_id       |
| /sources/:source_id        | DELETE | -          | Deletes the source identified by ID :source_id       |
| /sources/:source_id/points | GET    | -          | Returns points of source identified by ID :source_id |

## Environment variables

| Variable           | Description                                       |
| ------------------ | ------------------------------------------------- |
| MQTT_URL           | URL of the MQTT Broker                            |
| MQTT_USERNAME      | Username to access the MQTT broker                |
| MQTT_PASSWORD      | Password to access the MQTT broker                |
| MONGODB_URL        | URL of the MongoDB instance                       |
| MONGODB_DB         | Name of the MongoDB DB, defaults to 'mqtt_logger' |
| INFLUXDB_URL       | URL of the InfluxDB instance                      |
| INFLUXDB_ORG       | Organization used in InfluxDB                     |
| INFLUXDB_BUCKET    | Bucket used in InfluxDB                           |
| INFLUXDB_TOKEN     | Token used to access InfluxDB                     |
| IDENTIFICATION_URL | URL for user identification (Optional)            |

Note: Authentication is enables if IDENTIFICATION_URL is set
