package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		System.out.println("\n🎮 Kill-n-Keep Backend Starting...");
		SpringApplication.run(DemoApplication.class, args);
		System.out.println("🎮 Kill-n-Keep Backend Started!");
		System.out.println("🌐 Server: http://localhost:8081");
		System.out.println("📊 H2 Console: http://localhost:8081/h2-console");
	}
}
