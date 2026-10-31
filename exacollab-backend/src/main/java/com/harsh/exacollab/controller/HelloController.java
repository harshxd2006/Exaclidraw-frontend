package com.harsh.exacollab.controller;

import com.harsh.exacollab.dto.HelloRequest;

import java.util.Map;

import org.springframework.http.ResponseEntity;  // status code
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.PostMapping;   // connects the java method to an http post request
import org.springframework.web.bind.annotation.RequestBody;  // to read request body and convert json into java object

@RestController      //  responsible for handling the request
public class HelloController {

    @GetMapping("/api/hello")
    public Map<String, String> hello(
            @RequestParam(defaultValue = "Harsh") String name) {

        return Map.of(
                "message", "Hello, " + name + "!",
                "project", "ExaCollab Backend",
                "status", "running"
        );
    }

    @PostMapping("/api/hello")
public ResponseEntity<Map<String, String>> receiveData(
        @RequestBody HelloRequest request) {

    String name = request.getName();

    if (name == null || name.isBlank()) {
        name = "Friend";
    }

    return ResponseEntity.ok(
        Map.of(
            "message", "POST request received successfully",
            "greeting", "Hello, " + name + "!"
        )
    );
}
}