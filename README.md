# MQTT Logger
Stores data sent over MQTT into an InfluxDB time series database.

An article about this project is available [here](https://articles.maximemoreillon.com/articles/5aa92bbf-956c-43a9-8f3c-e0bdacd6412d)

[![dockeri.co](https://dockeri.co/image/moreillon/mqtt-logger)](https://hub.docker.com/r/moreillon/mqtt-logger)

## Environment variables
| Variable | Description |
| --- | --- |
| MQTT_URL | URL of the MQTT Broker | 
| MQTT_USERNAME | Username to access the MQTT broker | 
| MQTT_PASSWORD | Password to access the MQTT broker | 
| MONGODB_URL | URL of the MongoDB instance | 
| MONGODB_DB | Name of the MongoDB DB, defaults to 'mqtt_logger' | 
| INFLUXDB_URL | URL of the InfluxDB instance | 
| INFLUXDB_ORG | Organization used in InfluxDB | 
| INFLUXDB_BUCKET | Bucket used in InfluxDB | 
| INFLUXDB_TOKEN | Token used to access InfluxDB | 