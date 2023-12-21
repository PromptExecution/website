use wasm_bindgen::prelude::*;
use ws_stream_wasm::*;
use futures_util::sink::SinkExt;
use futures_util::stream::StreamExt;
use log;

#[wasm_bindgen(start)]
pub async fn run() -> Result<(), JsValue> {
    wasm_logger::init(wasm_logger::Config::default());

    let (mut ws, mut wsio) = WsMeta::connect("ws://fung1.lan:8080", None).await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let msg = WsMessage::Text(String::from(r#"{"verb":"begin"}"#));
    wsio.send(msg).await.map_err(|e| JsValue::from_str(&e.to_string()))?;

    wasm_bindgen_futures::spawn_local(async move {
        while let Some(message) = wsio.next().await {
            match message {
                WsMessage::Text(t) => log::info!("Received text: {}", t),
                WsMessage::Binary(_) => log::info!("Received binary data"),
                // Handle other cases as necessary
            }
        }
    });

    Ok(())
}
