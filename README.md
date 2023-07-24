# mqtt-to-webhook

Ingesting IoT data into Webhook using MQTT and EMQX | MQTT Webhook Integration

## Introduction

This tutorial will show you how to ingest MQTT data and client events to a webserver through EMQX webhook integration.

Webhook is available in EMQX Open Source, but it offers both advantages and disadvantages compared to EMQX Enterprise, which directly integrates with the database.

**Advantages**

- Webhook + Webserver allows you to customize data processing logic flexibly according to your needs. You can write custom code to handle data and integrate it with other systems, such as writing to a database, to achieve more complex and personalized data processing operations.

**Disadvantages**

- Complexity: Introducing Webhook and Webserver adds system complexity. Developing and maintaining additional middleware code may require more resources.

- Performance: Webhook + Webserver solution usually has lower performance when handling many requests and data compared to direct database writing(e.g. [mqtt-to-timescaledb](https://github.com/emqx/mqtt-to-timescaledb)). Processing delay may increase due to multiple components, impacting response performance.

- Costs: Involving multiple components (Webhook, Webserver) increases deployment and maintenance costs, adding to system complexity.

## Architecture

| Name      | Version | Description                                                                      |
| --------- | ------- | -------------------------------------------------------------------------------- |
| [EMQX](https://www.emqx.io)      | 5.0.3+  | MQTT broker used for message exchange between MQTT clients and the webserver. |
| [MQTTX CLI](https://mqttx.app/cli) | 1.9.3+  | Command-line tool used to generate simulated data for testing.        |
| [Node.js](https://nodejs.org) | 18.17 | Start a webserver to handle requests from EMQX. |

## How to use

1. Please make sure you have installed the [docker](https://www.docker.com/), and then running the following commands to start the demo:

  ```bash
  docker-compose up -d
  ```

2. Webserver will store data in the `webserver/db.json` file, and you can view the data via following REST API:

  ```bash
  $ curl http://localhost:3000/events
  {"devocesCount":1,"messagesCount":1,"devices":[...],"messages":[...]}
  ```

## License

[Apache License 2.0](./LICENSE)
