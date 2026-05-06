"use client";
import React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signupSchema } from "@/validation/auth.validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import useRegisterDialog from "@/hooks/use-register.dialog";
import useLoginDialog from "@/hooks/use-login-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerMutationFn } from "@/lib/fetcher";
import { toast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";

const RegisterDialog = () => {
  const { open, onClose } = useRegisterDialog();
  const { onOpen } = useLoginDialog();

  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: registerMutationFn,
  });

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      shopName: "",
      password: "",
      accountType: "buyer",
    },
  });

  const accountType = form.watch("accountType");

  const onSubmit = (values: z.infer<typeof signupSchema>) => {
    mutate(values, {
      onSuccess: async (_, variables) => {
        await queryClient.refetchQueries({ queryKey: ["currentUser"] });
        router.refresh();
        toast({
          title: "Registration successful",
          description:
            variables.accountType === "buyer"
              ? "You can book appointments with sellers from car listings."
              : "Your shop is ready — add listings when you're ready.",
          variant: "success",
        });
        form.reset({
          name: "",
          email: "",
          shopName: "",
          password: "",
          accountType: "buyer",
        });
        onClose();
      },
      onError: () => {
        toast({
          title: "Error occurred",
          description: "Registration failed. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleLoginOpen = () => {
    onClose();
    onOpen();
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
          <DialogDescription>
            Choose buyer or seller. Buyers can book appointments with sellers;
            sellers get a shop to list cars.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I am registering as</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v === "buyer") {
                          form.setValue("shopName", "");
                        }
                      }}
                      value={field.value}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-2 rounded-md border p-3">
                        <RadioGroupItem value="buyer" id="reg-buyer" />
                        <div className="grid gap-0.5 leading-none">
                          <Label
                            htmlFor="reg-buyer"
                            className="font-medium cursor-pointer"
                          >
                            Buyer
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Book appointments, message sellers, browse listings.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-md border p-3">
                        <RadioGroupItem value="seller" id="reg-seller" />
                        <div className="grid gap-0.5 leading-none">
                          <Label
                            htmlFor="reg-seller"
                            className="font-medium cursor-pointer"
                          >
                            Seller / dealer
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Create a shop and publish car listings.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Smith"
                      className="!h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="mail@example.com"
                      type="email"
                      className="!h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accountType === "seller" ? (
              <FormField
                control={form.control}
                name="shopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your dealership or garage name"
                        className="!h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="********"
                      type="password"
                      className="!h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              size="lg"
              disabled={isPending}
              className="w-full"
              type="submit"
            >
              {isPending && <Loader className="w-4 h-4 animate-spin" />}
              Register
            </Button>
          </form>
        </Form>

        <div className="mt-2 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button type="button" className="!text-primary" onClick={handleLoginOpen}>
              Sign in
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterDialog;
